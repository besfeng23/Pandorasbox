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
 * @returns The LLM API base URL
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
 * Stream chat completion from the LLM API
 * Sends a POST request to the chat completions endpoint with streaming enabled
 * Returns the raw Response object directly, allowing the caller to handle stream piping
 * 
 * @param messages Array of chat messages with role and content
 * @returns Promise<Response> The raw Response object from the fetch request
 * @throws Error if LLM_API_URL is not configured, if the request fails, or if connection errors occur
 * 
 * @example
 * ```ts
 * import { streamChatCompletion } from '@/lib/llm/llm-client';
 * 
 * // In a Next.js API route
 * const response = await streamChatCompletion([
 *   { role: 'system', content: 'You are a helpful assistant.' },
 *   { role: 'user', content: 'Hello, how are you?' }
 * ]);
 * 
 * // Return the response directly, allowing Next.js to handle streaming
 * return response;
 * ```
 */
export async function streamChatCompletion(
  messages: ChatMessage[]
): Promise<Response> {
  // Ensure this is only called server-side
  if (typeof window !== 'undefined') {
    throw new Error(
      'streamChatCompletion can only be used on the server side. This must be called from API routes or Server Actions.'
    );
  }

  try {
    const apiUrl = getLLMApiUrl();
    const endpoint = `${apiUrl}/v1/chat/completions`;

    // Prepare request headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if API key is provided
    if (process.env.LLM_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.LLM_API_KEY}`;
    }

    // Prepare request body with streaming enabled
    const requestBody = {
      messages,
      stream: true,
      model: process.env.LLM_MODEL || 'llama-3', // Default model
      temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.7'),
      max_tokens: parseInt(process.env.LLM_MAX_TOKENS || '2048', 10),
    };

    // Make the fetch request with streaming enabled
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    // Check if the request was successful
    if (!response.ok) {
      let errorBody: string;
      try {
        errorBody = await response.text();
      } catch {
        errorBody = 'Unable to read error response body';
      }
      throw new Error(
        `LLM API chat completion request failed: ${response.status} ${response.statusText}. ${errorBody}`
      );
    }

    // Verify that the response has a readable stream body
    if (!response.body) {
      throw new Error('LLM API response does not have a readable stream body');
    }

    // Return the raw Response object directly
    // The caller (Next.js API route) can handle the stream piping
    return response;
  } catch (error: any) {
    // Provide helpful error messages for common issues
    if (error instanceof Error) {
      // Network connection errors
      if (
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ECONNRESET')
      ) {
        const apiUrl = process.env.LLM_API_URL || 'LLM_API_URL';
        throw new Error(
          `Failed to connect to LLM API at ${apiUrl}. Please verify the service is running and the URL is correct.`
        );
      }
      throw error;
    }

    // Handle unknown errors
    throw new Error(`LLM API chat completion request failed: ${error?.message || 'Unknown error'}`);
  }
}

/**
 * Generate embeddings for an array of texts
 * Sends a POST request to the embeddings endpoint and parses the response
 * Returns an array of embedding vectors (number[][]) with 1536 dimensions
 * 
 * @param texts Array of text strings to generate embeddings for
 * @returns Promise<number[][]> Array of embedding vectors, one per input text
 * @throws Error if LLM_API_URL is not configured, if the request fails, or if the response structure is unexpected
 * 
 * @example
 * ```ts
 * import { getEmbeddings } from '@/lib/llm/llm-client';
 * 
 * // Generate embeddings for multiple texts
 * const embeddings = await getEmbeddings(['Text 1', 'Text 2']);
 * // Returns: [[0.1, 0.2, ...], [0.3, 0.4, ...]]
 * // Each embedding is a 1536-dimensional vector
 * ```
 */
export async function getEmbeddings(texts: string[]): Promise<number[][]> {
  // Ensure this is only called server-side
  if (typeof window !== 'undefined') {
    throw new Error(
      'getEmbeddings can only be used on the server side. This must be called from API routes or Server Actions.'
    );
  }

  try {
    const apiUrl = getLLMApiUrl();
    const endpoint = `${apiUrl}/v1/embeddings`;

    // Prepare request headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if API key is provided
    if (process.env.LLM_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.LLM_API_KEY}`;
    }

    // Prepare request body
    // Use model name for 1536-dimensional embeddings (e.g., text-embedding-ada-002)
    const requestBody = {
      input: texts,
      model: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002', // Default model for 1536 dimensions
    };

    // Make the fetch request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    // Check if the request was successful
    if (!response.ok) {
      let errorBody: string;
      try {
        errorBody = await response.text();
      } catch {
        errorBody = 'Unable to read error response body';
      }
      throw new Error(
        `LLM API embeddings request failed: ${response.status} ${response.statusText}. ${errorBody}`
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
    if (embeddings.length !== texts.length) {
      throw new Error(
        `Embeddings count mismatch. Expected ${texts.length} embeddings, received ${embeddings.length}`
      );
    }

    // Validate embedding dimensions (should be 1536 for text-embedding-ada-002)
    const expectedDimension = 1536;
    for (let i = 0; i < embeddings.length; i++) {
      if (embeddings[i].length !== expectedDimension) {
        throw new Error(
          `Embedding dimension mismatch at index ${i}. Expected ${expectedDimension} dimensions, received ${embeddings[i].length}`
        );
      }
    }

    return embeddings;
  } catch (error: any) {
    // Provide helpful error messages for common issues
    if (error instanceof Error) {
      // Network connection errors
      if (
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ECONNRESET')
      ) {
        const apiUrl = process.env.LLM_API_URL || 'LLM_API_URL';
        throw new Error(
          `Failed to connect to LLM API at ${apiUrl}. Please verify the service is running and the URL is correct.`
        );
      }
      throw error;
    }

    // Handle unknown errors
    throw new Error(`LLM API embeddings request failed: ${error?.message || 'Unknown error'}`);
  }
}
