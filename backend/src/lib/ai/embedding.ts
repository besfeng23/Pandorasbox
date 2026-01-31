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

  // Embedding service uses OpenAI-compatible endpoint: /v1/embeddings
  // Handle both cases: base URL with or without /v1
  let url: string;
  if (config.embeddingsBaseUrl.includes('/v1/embeddings')) {
    url = config.embeddingsBaseUrl;
  } else if (config.embeddingsBaseUrl.endsWith('/v1')) {
    url = `${config.embeddingsBaseUrl}/embeddings`;
  } else if (config.embeddingsBaseUrl.endsWith('/v1/')) {
    url = `${config.embeddingsBaseUrl}embeddings`;
  } else {
    // Default: append /v1/embeddings
    url = `${config.embeddingsBaseUrl.replace(/\/$/, '')}/v1/embeddings`;
  }

  try {
    console.log(`[AI] Embedding text at ${url} (Length: ${normalizedText.length})`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    body: JSON.stringify({
      // OpenAI-compatible format
      input: normalizedText,
      // Note: model field is optional - embedding service uses MODEL_NAME env var
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
      // Support both OpenAI-compatible format (data[0].embedding) and custom format (embedding)
      if (result.data && Array.isArray(result.data) && result.data[0]?.embedding) {
        return result.data[0].embedding;
      }
      return result.embedding || result.embeddings?.[0] || [];
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
