'use server';

import 'server-only';
import { getServerConfig } from '@/server/config';

/**
 * Generates an embedding for the given text using a hosted embedding model.
 * @param text The text to generate an embedding for.
 * @returns The embedding vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const config = await getServerConfig();
  const normalizedText = text.trim();

  if (!normalizedText) {
    return Array(config.embeddingsDimension).fill(0);
  }

  const url = `${config.embeddingsBaseUrl}/embed`;

  try {
    console.log(`[AI] Embedding text at ${url} (Length: ${normalizedText.length})`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: normalizedText,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[AI] Embedding failed. Status: ${response.status} ${response.statusText}`);
      console.error(`[AI] Response Body: ${errorText.substring(0, 500)}`); // Log first 500 chars
      throw new Error(`Embedding inference failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    // Defensive JSON parsing
    const textResult = await response.text();
    try {
      const result = JSON.parse(textResult);
      return result.embedding;
    } catch (jsonError) {
      console.error('[AI] JSON Parse Error on Embedding Response');
      console.error('[AI] Received content:', textResult.substring(0, 500)); // Log what we actually got
      throw new Error(`Invalid JSON code from Embedding API: ${textResult.substring(0, 50)}...`);
    }

  } catch (error: any) {
    console.error(`[AI] Critical Embedding Error: ${error.message}`);
    // Fallback or rethrow? For now rethrow to warn user.
    throw error;
  }
}

/**
 * Generates embeddings for multiple texts in a single batch.
 * @param texts Array of texts to generate embeddings for.
 * @returns Array of embedding vectors.
 */
export async function embedTextsBatch(texts: string[]): Promise<number[][]> {
  const config = await getServerConfig();

  if (texts.length === 0) {
    return [];
  }

  // Assuming the self-hosted endpoint might support batches or we loop.
  // For now, let's implement a simple loop if the endpoint doesn't support batches.
  // Many local embedding servers support batching at /embed with an array.

  const response = await fetch(`${config.embeddingsBaseUrl}/embed_batch`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      texts: texts.map(t => t.trim() || ' '),
    }),
  });

  if (!response.ok) {
    // Fallback to individual requests if batch endpoint fails
    return Promise.all(texts.map(text => embedText(text)));
  }

  const result = await response.json();
  return result.embeddings;
}
