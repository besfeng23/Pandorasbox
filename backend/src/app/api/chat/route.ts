import { NextRequest, NextResponse } from 'next/server';
import { streamInference, completeInference, ChatMessage } from '@/lib/sovereign/inference';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { OpenAIStream, StreamingTextResponse, StreamData } from 'ai';
import { preCheck } from '@/server/guardrails';
import { getAgentConfig } from '@/lib/agent-types';
import { searchPoints, upsertPoint } from '@/lib/sovereign/qdrant-client';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { Timestamp } from 'firebase-admin/firestore';
import { embedText } from '@/lib/ai/embedding';
import { v4 as uuidv4 } from 'uuid';

// 2. Define Constants
const MEMORY_COLLECTION = 'pandora_memory';
const TOP_K = 5;

export async function OPTIONS() {
  return handleOptions();
}

/**
 * Helper function to verify authentication and extract userId
 */
async function verifyAuth(request: NextRequest): Promise<{ userId: string } | { error: NextResponse }> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return {
      error: NextResponse.json(
        { error: 'Unauthorized: No Bearer token provided' },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }

  const idToken = authHeader.substring(7); // Remove 'Bearer '
  try {
    const decodedToken = await getAuthAdmin().verifyIdToken(idToken);
    return { userId: decodedToken.uid };
  } catch (error: any) {
    return {
      error: NextResponse.json(
        { error: error.message || 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      ),
    };
  }
}

/**
 * POST /api/chat
 * Core streaming chat API route
 * Body: { conversationId: string | null, userMessage: string }
 */
export async function POST(request: NextRequest) {
  let conversationId: string | null = null;
  let userId: string;
  let userMessageId: string | null = null;

  try {
    // 1. Authentication
    const authResult = await verifyAuth(request);
    if ('error' in authResult) {
      return authResult.error;
    }
    userId = authResult.userId;

    // 2. Parse input
    const body = await request.json();
    const { conversationId: providedConversationId, userMessage } = body;

    if (!userMessage || typeof userMessage !== 'string' || userMessage.trim().length === 0) {
      return NextResponse.json(
        { error: 'userMessage is required and must be a non-empty string' },
        { status: 400, headers: corsHeaders() }
      );
    }

    conversationId = providedConversationId || null;
    const db = getFirestoreAdmin();
    const now = Timestamp.now();
    let agentId: 'builder' | 'universe' = 'builder';

    // 3. Persistence (Start): Save user message immediately
    // If conversationId is null, create a new conversation first
    if (!conversationId) {
      // Create new conversation with agent: 'builder'
      const conversationRef = db.collection('conversations');
      const newConversation = await conversationRef.add({
        userId,
        name: 'New Chat',
        agent: 'builder',
        createdAt: now,
        updatedAt: now,
      });
      conversationId = newConversation.id;
      agentId = 'builder';
    } else {
      // Verify conversation exists and user owns it, and get agent
      const conversationDoc = await db.collection('conversations').doc(conversationId).get();
      if (!conversationDoc.exists) {
        return NextResponse.json(
          { error: 'Conversation not found' },
          { status: 404, headers: corsHeaders() }
        );
      }
      const conversationData = conversationDoc.data();
      if (conversationData?.userId !== userId) {
        return NextResponse.json(
          { error: 'Forbidden: You do not have access to this conversation' },
          { status: 403, headers: corsHeaders() }
        );
      }
      agentId = (conversationData.agent as 'builder' | 'universe') || 'builder';
    }

    // Save user message to messages subcollection
    const messagesRef = db
      .collection('conversations')
      .doc(conversationId)
      .collection('messages');

    const userMessageDoc = await messagesRef.add({
      role: 'user',
      content: userMessage.trim(),
      createdAt: now,
    });
    userMessageId = userMessageDoc.id;

    // 1. Context Retrieval: Fetch last 5 turns (10 messages) from Firestore if conversationId is provided
    // Exclude the current user message we just saved
    let conversationContext: ChatMessage[] = [];
    if (conversationId) {
      const historySnapshot = await messagesRef
        .orderBy('createdAt', 'desc')
        .limit(11) // Get 11 to account for the current message, then filter it out
        .get();
      
      // Filter out the current user message and reverse to get chronological order (oldest first)
      conversationContext = historySnapshot.docs
        .filter((doc) => doc.id !== userMessageId) // Exclude current user message
        .slice(0, 10) // Take last 10 messages (5 turns)
        .reverse()
        .map((doc) => {
          const data = doc.data();
          return {
            role: data.role as 'user' | 'assistant',
            content: data.content,
          };
        });
    }

    // Guardrails check
    const preResult = preCheck(userMessage.trim(), agentId);
    if (!preResult.allowed) {
      return new StreamingTextResponse(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode(preResult.reason));
            controller.close();
          },
        }),
        { headers: corsHeaders() }
      );
    }

    const config = getAgentConfig(agentId);
    const streamData = new StreamData();

    // Build base system prompt
    const SOVEREIGN_PROMPT = `You are "Pandora", a private, air-gapped AI assistant running on Sovereign Infrastructure.

CORE PRINCIPLES:
- You do NOT have access to the public internet.
- You have access to a local knowledge base (memories) that has been indexed from user uploads.
- Always verify information from the provided Context before answering.
- If the user asks a question, prioritize information from the Context.
- If Context is not available or doesn't contain relevant information, say so honestly.
- Keep responses concise, relevant, and grounded in the provided Context.
- Cite sources when referencing Context (e.g., "According to [source]...").`;

    let systemPrompt = `${SOVEREIGN_PROMPT}\n\n${config.systemPrompt}`;

    // 3. Embed User Message & 4. Vector Search (RAG)
    // Perform RAG retrieval before streaming to augment the prompt
    let contextualMemoryBlock = '';
    
    if (userMessage.trim().length > 0) {
      streamData.append({
        type: 'tool_start',
        toolName: 'search_knowledge_base',
        display: 'Searching Knowledge Base...',
      });

      try {
        // 3. Embed User Message: Generate vector embedding for the user message
        const userMessageEmbedding = await embedText(userMessage.trim());

        // 4. Vector Search: Perform nearest neighbor search on MEMORY_COLLECTION
        const filter = {
          must: [
            { key: 'userId', match: { value: userId } },
            { key: 'agentId', match: { value: agentId } },
          ],
        };

        const memoryResults = await searchPoints(MEMORY_COLLECTION, userMessageEmbedding, TOP_K, filter);

        // 5. Context Construction: Process Qdrant search results
        if (memoryResults.length > 0) {
          // Extract text content from each retrieved document
          // Support multiple possible payload field names for content
          const contextChunks = memoryResults.map((result) => {
            const textContent = 
              result.payload?.text_content || 
              result.payload?.content || 
              result.payload?.text || 
              '';
            
            return textContent.trim();
          }).filter((chunk) => chunk.length > 0); // Filter out empty chunks

          if (contextChunks.length > 0) {
            // Format context block with clear header as specified
            contextualMemoryBlock = `--- CONTEXTUAL MEMORY RETRIEVED ---
${contextChunks.join('\n\n')}
-----------------------------------`;

            streamData.append({
              type: 'tool_end',
              toolName: 'search_knowledge_base',
              status: 'success',
              result: `Found ${memoryResults.length} relevant memory chunks.`,
            });
          } else {
            // No valid content found in results
            streamData.append({
              type: 'tool_end',
              toolName: 'search_knowledge_base',
              status: 'success',
              result: 'No valid content found in retrieved memories.',
            });
          }
        } else {
          // No results returned from search
          streamData.append({
            type: 'tool_end',
            toolName: 'search_knowledge_base',
            status: 'success',
            result: 'No relevant memories found.',
          });
        }
      } catch (ragError: any) {
        // 7. Error Handling: Graceful fallback - log error but continue without RAG
        console.error('[RAG] Error during memory retrieval:', ragError);
        streamData.append({
          type: 'tool_end',
          toolName: 'search_knowledge_base',
          status: 'error',
          error: ragError.message || 'Memory retrieval failed',
        });
        // Continue without RAG augmentation - contextualMemoryBlock remains empty
      }
    }

    // 6. Prompt Augmentation: Inject contextual memory block into system prompt
    if (contextualMemoryBlock) {
      systemPrompt += `\n\n${contextualMemoryBlock}`;
    }

    // 6. Prompt Augmentation: Construct final message array
    // Structure: System Instructions → (Optional) Conversation History → Contextual Memory Block → Current User Message
    // Note: Contextual memory is already injected into systemPrompt above
    
    // Build message array with conversation history (last 5 turns = 10 messages max)
    // Limit to avoid token limits while maintaining context
    const recentHistory = conversationContext.slice(-10);
    let messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt }, // System Instructions + Contextual Memory Block
      ...recentHistory, // (Optional) Conversation History
      { role: 'user', content: userMessage.trim() }, // Current User Message
    ];

    // 4. LLM Interaction & Streaming: Call streamInference with augmented prompt
    let fullCompletion = '';

    const aiStream = OpenAIStream(stream as any, {
      onToken: (token: string) => {
        // Accumulate tokens for final persistence and memory extraction
        fullCompletion += token;
      },
      async onFinal(completion: string) {
        await streamData.close();

        const finalAssistantResponse = completion || fullCompletion;

        // 5. Persistence: Save assistant message after stream finishes
        try {
          const assistantMessageRef = messagesRef.doc();
          await assistantMessageRef.set({
            role: 'assistant',
            content: finalAssistantResponse,
            createdAt: Timestamp.now(),
          });

          // Update conversation's updatedAt field
          await db.collection('conversations').doc(conversationId).update({
            updatedAt: Timestamp.now(),
          });
        } catch (saveError) {
          console.error('Failed to save assistant response to Firestore:', saveError);
          // Don't throw - streaming already completed
        }

        // 6. Memory Extraction & Indexing (Post-Stream): Background process
        // Summarize the entire turn and index to Qdrant
        try {
          await extractAndIndexMemory(
            userId,
            agentId,
            userMessage.trim(),
            finalAssistantResponse,
            conversationId
          );
        } catch (memoryError) {
          // Log but don't fail the request - memory extraction is non-critical
          console.error('Memory extraction failed (non-critical):', memoryError);
        }
      },
      experimental_streamData: true,
    });

    // Return streaming response with text/event-stream format
    // Include conversationId in headers for client to capture
    return new StreamingTextResponse(aiStream, {
      headers: {
        ...corsHeaders(),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'X-Conversation-Id': conversationId, // Return conversationId in header
      },
    });
  } catch (error: any) {
    // 8. Error Handling: Gracefully handle LLM failures or streaming errors
    console.error('Chat API error:', error);

    // If we created a conversation but failed, we could optionally clean it up
    // For now, we'll leave it (user can delete it manually if needed)

    // Return appropriate error response
    if (error.message?.includes('Inference System Offline')) {
      return NextResponse.json(
        { error: 'Inference System Offline - Check Container.' },
        { status: 503, headers: corsHeaders() }
      );
    }

    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Forbidden') ? 403 : 401, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Failed to process chat message' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

/**
 * Memory Extraction & Indexing Helper Function
 * Summarizes a conversation turn and indexes it to Qdrant for long-term memory
 */
async function extractAndIndexMemory(
  userId: string,
  agentId: 'builder' | 'universe',
  userMessage: string,
  assistantResponse: string,
  conversationId: string
): Promise<void> {
  try {
    // 1. Summarize the entire turn (User Message + Assistant Response)
    const summaryPrompt: ChatMessage[] = [
      {
        role: 'system',
        content: `You are a memory extraction system. Analyze the following conversation turn and create a concise, high-density summary (under 200 words) that captures:
- Key topics discussed
- Important information shared
- Decisions made or conclusions reached
- Any facts, dates, names, or specific details mentioned

Focus on information that would be useful for future reference and retrieval.`,
      },
      {
        role: 'user',
        content: `User: ${userMessage}\n\nAssistant: ${assistantResponse}\n\nProvide a summary of this conversation turn:`,
      },
    ];

    const summary = await completeInference(summaryPrompt, 0.3);

    if (!summary || summary.trim().length === 0) {
      console.warn('Empty summary generated, skipping memory indexing');
      return;
    }

    // 2. Generate vector embedding for the summary
    const summaryEmbedding = await embedText(summary);

    // 3. Index the memory to Qdrant MEMORY_COLLECTION
    const memoryId = uuidv4();
    const memoryPayload = {
      userId,
      agentId,
      conversationId,
      text_content: `${userMessage}\n\n${assistantResponse}`, // Full turn content (primary field)
      content: `${userMessage}\n\n${assistantResponse}`, // Also store as 'content' for backward compatibility
      summary: summary.trim(),
      source: `conversation:${conversationId}`,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };

    await upsertPoint(MEMORY_COLLECTION, {
      id: memoryId,
      vector: summaryEmbedding,
      payload: memoryPayload,
    });

    console.log(`[Memory Extraction] Successfully indexed memory ${memoryId} for conversation ${conversationId}`);
  } catch (error: any) {
    console.error('[Memory Extraction] Error:', error);
    throw error; // Re-throw to be caught by caller
  }
}

