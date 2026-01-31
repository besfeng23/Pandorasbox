'use server';

import 'server-only';
import { getServerConfig } from '@/server/config';

/**
 * Generates an embedding for the given text using a hosted embedding model.
 * @param text The text to generate an embedding for.
 * @returns The embedding vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const startTime = Date.now();
  const config = await getServerConfig();
  const normalizedText = text.trim();

  console.log('[Embedding] Starting embedding generation:', {
    textLength: normalizedText.length,
    baseUrl: config.embeddingsBaseUrl,
    dimension: config.embeddingsDimension
  });

  if (!normalizedText) {
    console.warn('[Embedding] Empty text provided, returning zero vector');
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
    console.log(`[Embedding] Request URL: ${url}, Text length: ${normalizedText.length}`);

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
      const duration = Date.now() - startTime;
      console.error(`[Embedding] Request failed:`, {
        status: response.status,
        statusText: response.statusText,
        url,
        duration: `${duration}ms`,
        errorPreview: errorText.substring(0, 200)
      });
      throw new Error(`Embedding inference failed: ${response.status} - ${errorText.substring(0, 100)}`);
    }

    // Defensive JSON parsing
    const textResult = await response.text();
    try {
      const result = JSON.parse(textResult);
      // Support both OpenAI-compatible format (data[0].embedding) and custom format (embedding)
      let embedding: number[];
      if (result.data && Array.isArray(result.data) && result.data[0]?.embedding) {
        embedding = result.data[0].embedding;
      } else {
        embedding = result.embedding || result.embeddings?.[0] || [];
      }
      
      const duration = Date.now() - startTime;
      console.log(`[Embedding] Success:`, {
        duration: `${duration}ms`,
        embeddingLength: embedding.length,
        format: result.data ? 'OpenAI-compatible' : 'custom'
      });
      
      return embedding;
    } catch (jsonError: any) {
      const duration = Date.now() - startTime;
      console.error('[Embedding] JSON Parse Error:', {
        error: jsonError.message,
        duration: `${duration}ms`,
        responsePreview: textResult.substring(0, 500)
      });
      throw new Error(`Invalid JSON from Embedding API: ${textResult.substring(0, 50)}...`);
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`[Embedding] Critical Error:`, {
      message: error.message,
      duration: `${duration}ms`,
      url,
      stack: error.stack?.substring(0, 200)
    });
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
