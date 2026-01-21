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

  const response = await fetch(`${config.embeddingsBaseUrl}/embed`, {
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
    throw new Error(`Embedding inference failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  // Expecting format like { "embedding": [0.1, 0.2, ...] }
  return result.embedding;
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
