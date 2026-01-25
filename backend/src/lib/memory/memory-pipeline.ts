'use server';

import 'server-only';
import { type ChatMessage, callLLM, getEmbedding } from '@/lib/llm/llm-client';
import { upsertVectors, MEMORY_COLLECTION_NAME } from '@/lib/vector/qdrant-client';
import { MemoryChunkSchema, type MemoryChunk } from './memory-types';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

/**
 * Extract and store memory chunks from conversation history
 * Uses LLM to extract structured knowledge and stores it in Qdrant
 * @param history Array of chat messages to analyze
 * @returns Promise<{ success: boolean; chunksStored: number; errors?: string[] }>
 */
export async function extractAndStoreMemory(
  history: ChatMessage[]
): Promise<{ success: boolean; chunksStored: number; errors?: string[] }> {
  const errors: string[] = [];

  try {
    // 1. Validate input
    if (!history || history.length === 0) {
      return { success: false, chunksStored: 0, errors: ['History is empty'] };
    }

    // 2. Construct system prompt for memory extraction
    const systemPrompt = `You are a memory extraction system. Analyze the following conversation and extract key knowledge, facts, and insights.

Your task is to return a JSON object with a "chunks" property containing an array of memory chunks. Each memory chunk must conform to this exact schema:
{
  "id": "uuid-string",
  "title": "Brief descriptive summary (max 100 characters)",
  "content": "Detailed knowledge/fact extracted from the conversation",
  "tags": ["keyword1", "keyword2", ...]
}

Return format:
{
  "chunks": [
    { "id": "...", "title": "...", "content": "...", "tags": [...] },
    ...
  ]
}

Guidelines:
- Extract only significant, reusable knowledge (facts, insights, decisions, preferences)
- Each chunk should be self-contained and meaningful
- Use clear, concise titles
- Include relevant tags for classification and retrieval
- Avoid extracting trivial or conversational elements
- Focus on information that would be useful for future reference

Return ONLY a valid JSON object with the "chunks" array, no additional text or explanation.`;

    // Build conversation context for the LLM
    const conversationText = history
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n\n');

    const userPrompt = `Analyze this conversation and extract memory chunks:\n\n${conversationText}`;

    // 3. Call LLM with JSON mode for structured output
    const llmResponse = await callLLM(
      [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.3, // Lower temperature for more focused extraction
        max_tokens: 2048,
        response_format: { type: 'json_object' }, // Request JSON output
      }
    );

    // 4. Parse and validate LLM output
    let parsedResponse: any;
    try {
      // Try to parse as JSON object first (if LLM wrapped it)
      parsedResponse = JSON.parse(llmResponse);
      
      // Handle case where LLM returns { "chunks": [...] } or similar wrapper
      if (parsedResponse.chunks && Array.isArray(parsedResponse.chunks)) {
        parsedResponse = parsedResponse.chunks;
      } else if (parsedResponse.memories && Array.isArray(parsedResponse.memories)) {
        parsedResponse = parsedResponse.memories;
      } else if (parsedResponse.data && Array.isArray(parsedResponse.data)) {
        parsedResponse = parsedResponse.data;
      }
      // If it's already an array, use it directly
      else if (!Array.isArray(parsedResponse)) {
        // If it's an object but not an array, try to extract array from common keys
        const arrayKeys = Object.keys(parsedResponse).filter((key) =>
          Array.isArray(parsedResponse[key])
        );
        if (arrayKeys.length > 0) {
          parsedResponse = parsedResponse[arrayKeys[0]];
        } else {
          throw new Error('LLM response is not an array or array wrapper');
        }
      }
    } catch (parseError: any) {
      const errorMsg = `Failed to parse LLM response as JSON: ${parseError.message}`;
      console.error('[Memory Pipeline]', errorMsg);
      console.error('[Memory Pipeline] Raw LLM response:', llmResponse);
      errors.push(errorMsg);
      return { success: false, chunksStored: 0, errors };
    }

    // Ensure we have an array
    if (!Array.isArray(parsedResponse)) {
      const errorMsg = 'LLM response is not a valid array';
      console.error('[Memory Pipeline]', errorMsg);
      errors.push(errorMsg);
      return { success: false, chunksStored: 0, errors };
    }

    // 5. Validate each chunk against the schema
    const validatedChunks: MemoryChunk[] = [];
    for (let i = 0; i < parsedResponse.length; i++) {
      try {
        const chunk = parsedResponse[i];
        
        // Ensure chunk has a UUID (generate if missing or invalid)
        if (!chunk.id || typeof chunk.id !== 'string') {
          chunk.id = uuidv4();
        } else {
          // Validate UUID format
          try {
            z.string().uuid().parse(chunk.id);
          } catch {
            chunk.id = uuidv4();
          }
        }

        // Validate against schema
        const validatedChunk = MemoryChunkSchema.parse(chunk);
        validatedChunks.push(validatedChunk);
      } catch (validationError: any) {
        const errorMsg = `Chunk ${i} validation failed: ${validationError.message}`;
        console.error('[Memory Pipeline]', errorMsg);
        console.error('[Memory Pipeline] Invalid chunk:', parsedResponse[i]);
        errors.push(errorMsg);
        // Continue processing other chunks
      }
    }

    if (validatedChunks.length === 0) {
      const errorMsg = 'No valid memory chunks extracted after validation';
      console.error('[Memory Pipeline]', errorMsg);
      errors.push(errorMsg);
      return { success: false, chunksStored: 0, errors };
    }

    // 6. Store each validated chunk in Qdrant
    let storedCount = 0;

    // Generate embeddings for all chunks in parallel
    const embeddingPromises = validatedChunks.map((chunk) => getEmbedding(chunk.content));
    const embeddings = await Promise.all(embeddingPromises);

    // Prepare points for batch upsert
    const points = validatedChunks.map((chunk, index) => ({
      id: chunk.id,
      vector: embeddings[index],
      payload: {
        title: chunk.title,
        content: chunk.content,
        tags: chunk.tags,
        // Additional metadata
        extractedAt: new Date().toISOString(),
        source: 'conversation',
      },
    }));

    // Batch upsert all points
    try {
      await upsertVectors(MEMORY_COLLECTION_NAME, points);
      storedCount = points.length;
      console.log(`[Memory Pipeline] Successfully stored ${storedCount} memory chunk(s) in batch`);
    } catch (storageError: any) {
      // If batch fails, try individual upserts
      console.warn('[Memory Pipeline] Batch upsert failed, trying individual upserts:', storageError.message);
      
      for (let i = 0; i < validatedChunks.length; i++) {
        try {
          await upsertVectors(MEMORY_COLLECTION_NAME, [points[i]]);
          storedCount++;
          console.log(`[Memory Pipeline] Stored memory chunk: ${validatedChunks[i].id} - ${validatedChunks[i].title}`);
        } catch (individualError: any) {
          const errorMsg = `Failed to store chunk ${validatedChunks[i].id}: ${individualError.message}`;
          console.error('[Memory Pipeline]', errorMsg);
          errors.push(errorMsg);
        }
      }
    }

    // 7. Return result
    const success = storedCount > 0;
    if (success) {
      console.log(`[Memory Pipeline] Successfully stored ${storedCount} memory chunk(s)`);
    }

    return {
      success,
      chunksStored: storedCount,
      ...(errors.length > 0 && { errors }),
    };
  } catch (error: any) {
    const errorMsg = `Memory extraction pipeline failed: ${error.message}`;
    console.error('[Memory Pipeline]', errorMsg, error);
    errors.push(errorMsg);
    return { success: false, chunksStored: 0, errors };
  }
}

