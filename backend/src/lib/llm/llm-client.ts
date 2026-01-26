'use server';

import 'server-only';

/**
 * Chat message type for LLM interactions
 * Supports standard chat message roles: user, assistant, and system
 */
export type ChatMessage = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

/**
 * Get LLM API base URL from environment variables
 * @returns The LLM API base URL (without /v1/chat/completions)
 * @throws Error if LLM_API_URL is not set
 */
function getLLMApiUrl(): string {
  const llmApiUrl = process.env.LLM_API_URL;

  if (!llmApiUrl) {
    throw new Error(
      'LLM_API_URL environment variable is required. Please set it in your .env.local file (e.g., LLM_API_URL=http://localhost:8000).'
    );
  }

  // Validate URL format
  try {
    new URL(llmApiUrl);
  } catch (error) {
    throw new Error(
      `Invalid LLM_API_URL format. Expected format: "http://host:port" or "https://host:port". Received: ${llmApiUrl}`
    );
  }

  // Remove trailing slash if present
  return llmApiUrl.replace(/\/$/, '');
}

/**
 * Get chat model name from environment variables
 * @returns The chat model name
 * @throws Error if CHAT_MODEL_NAME is not set
 */
function getChatModelName(): string {
  const chatModelName = process.env.CHAT_MODEL_NAME;

  if (!chatModelName) {
    throw new Error(
      'CHAT_MODEL_NAME environment variable is required. Please set it in your .env.local file (e.g., CHAT_MODEL_NAME=mistralai/Mistral-7B-Instruct-v0.3).'
    );
  }

  return chatModelName;
}

/**
 * Get embedding model name from environment variables
 * @returns The embedding model name
 * @throws Error if EMBEDDING_MODEL_NAME is not set
 */
function getEmbeddingModelName(): string {
  const embeddingModelName = process.env.EMBEDDING_MODEL_NAME;

  if (!embeddingModelName) {
    throw new Error(
      'EMBEDDING_MODEL_NAME environment variable is required. Please set it in your .env.local file (e.g., EMBEDDING_MODEL_NAME=bge-small-en-v1.5).'
    );
  }

  return embeddingModelName;
}

/**
 * Generate streaming chat completion from the LLM API
 * Sends a POST request to the chat completions endpoint with streaming enabled
 * Returns the raw ReadableStream from the response body for efficient streaming
 * 
 * @param messages Array of chat messages with role and content
 * @returns Promise<ReadableStream<Uint8Array>> The raw response body stream
 * @throws Error if environment variables are missing, if the request fails, or if the response is not streamable
 * 
 * @example
 * ```ts
 * import { generateChatStream } from '@/lib/llm/llm-client';
 * 
 * const stream = await generateChatStream([
 *   { role: 'system', content: 'You are a helpful assistant.' },
 *   { role: 'user', content: 'Hello, how are you?' }
 * ]);
 * 
 * // Pipe the stream to the client
 * return new Response(stream, {
 *   headers: {
 *     'Content-Type': 'text/event-stream',
 *     'Cache-Control': 'no-cache',
 *     'Connection': 'keep-alive',
 *   },
 * });
 * ```
 */
export async function generateChatStream(
  messages: ChatMessage[]
): Promise<ReadableStream<Uint8Array>> {
  try {
    const apiUrl = getLLMApiUrl();
    const modelName = getChatModelName();
    const endpoint = `${apiUrl}/v1/chat/completions`;

    // Prepare request body for streaming chat API
    const requestBody = {
      messages,
      stream: true,
      model: modelName,
    };

    // Make the fetch request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Check if the request was successful
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `LLM chat API request failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    // Verify that the response has a readable stream body
    if (!response.body) {
      throw new Error('LLM chat API response does not have a readable stream body');
    }

    // Return the raw ReadableStream for efficient streaming
    return response.body;
  } catch (error: any) {
    // Provide helpful error messages for common issues
    if (error instanceof Error) {
      // Network connection errors
      if (
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND')
      ) {
        throw new Error(
          `Failed to connect to LLM API at ${process.env.LLM_API_URL || 'LLM_API_URL'}. Please verify the service is running and the URL is correct.`
        );
      }
      throw error;
    }

    // Handle unknown errors
    throw new Error(`LLM chat API request failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for text or array of texts
 * Sends a POST request to the embeddings endpoint and parses the response
 * Returns an array of embedding vectors (number[][])
 * 
 * @param text Single text string or array of text strings to generate embeddings for
 * @returns Promise<number[][]> Array of embedding vectors, one per input text
 * @throws Error if environment variables are missing, if the request fails, or if the response structure is unexpected
 * 
 * @example
 * ```ts
 * import { generateEmbedding } from '@/lib/llm/llm-client';
 * 
 * // Single text
 * const embedding = await generateEmbedding('Hello, world!');
 * // Returns: [[0.1, 0.2, 0.3, ...]]
 * 
 * // Multiple texts
 * const embeddings = await generateEmbedding(['Text 1', 'Text 2']);
 * // Returns: [[0.1, 0.2, ...], [0.3, 0.4, ...]]
 * ```
 */
export async function generateEmbedding(
  text: string | string[]
): Promise<number[][]> {
  try {
    const apiUrl = getLLMApiUrl();
    const modelName = getEmbeddingModelName();
    const endpoint = `${apiUrl}/v1/embeddings`;

    // Prepare request body
    const requestBody = {
      input: text,
      model: modelName,
    };

    // Make the fetch request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Check if the request was successful
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `LLM embeddings API request failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    // Parse the JSON response
    const result = await response.json();

    // Validate response structure
    if (!result || !result.data || !Array.isArray(result.data)) {
      throw new Error(
        `Unexpected embeddings API response structure. Expected 'data' array, received: ${JSON.stringify(result)}`
      );
    }

    // Extract embedding vectors from the response
    // Expected format: { data: [{ embedding: number[], index: number }, ...] }
    const embeddings: number[][] = result.data.map((item: any) => {
      if (!item || !item.embedding || !Array.isArray(item.embedding)) {
        throw new Error(
          `Unexpected embedding item structure. Expected 'embedding' array, received: ${JSON.stringify(item)}`
        );
      }
      return item.embedding;
    });

    // Validate that we got the expected number of embeddings
    const inputArray = Array.isArray(text) ? text : [text];
    if (embeddings.length !== inputArray.length) {
      throw new Error(
        `Embeddings count mismatch. Expected ${inputArray.length} embeddings, received ${embeddings.length}`
      );
    }

    return embeddings;
  } catch (error: any) {
    // Provide helpful error messages for common issues
    if (error instanceof Error) {
      // Network connection errors
      if (
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND')
      ) {
        throw new Error(
          `Failed to connect to LLM API at ${process.env.LLM_API_URL || 'LLM_API_URL'}. Please verify the service is running and the URL is correct.`
        );
      }
      throw error;
    }

    // Handle unknown errors
    throw new Error(`LLM embeddings API request failed: ${error?.message || 'Unknown error'}`);
  }
}
