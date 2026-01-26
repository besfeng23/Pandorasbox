'use server';

import 'server-only';

/**
 * Custom error class for LLM API errors
 * Includes HTTP status code and response body for debugging
 */
export class LLMApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly responseBody?: string
  ) {
    super(message);
    this.name = 'LLMApiError';
  }
}

/**
 * Get LLM API URL from environment variables
 * @returns The LLM API URL with fallback to Ollama default
 */
function getLLMApiUrl(): string {
  // Use LLM_API_URL if set, otherwise fallback to Ollama's default endpoint
  const llmApiUrl = process.env.LLM_API_URL || 'http://localhost:11434/api/generate';

  // Validate URL format
  try {
    new URL(llmApiUrl);
  } catch (error) {
    throw new Error(
      `Invalid LLM_API_URL format. Expected format: "http://host:port/path" or "https://host:port/path". Received: ${llmApiUrl}`
    );
  }

  // Ensure the URL doesn't have a trailing slash
  return llmApiUrl.replace(/\/$/, '');
}

/**
 * Call the local LLM inference API with a custom request body
 * 
 * This function is designed for non-streaming operations required for memory management
 * and other server-side LLM operations. It accepts a generic body object that can be
 * customized for different LLM API formats (Ollama, OpenAI-compatible, etc.).
 * 
 * @param body - The request payload containing model, prompt, temperature, etc.
 * @returns Promise<any> - The parsed JSON response from the LLM API
 * @throws LLMApiError if the request fails with HTTP error status
 * @throws Error if called client-side or if network/parsing errors occur
 * 
 * @example
 * ```ts
 * import { callLLMApi } from '@/lib/llm/client';
 * 
 * // For Ollama format
 * const response = await callLLMApi({
 *   model: 'llama2',
 *   prompt: 'What is AI?',
 *   stream: false
 * });
 * 
 * // For OpenAI-compatible format
 * const response = await callLLMApi({
 *   model: 'gpt-3.5-turbo',
 *   messages: [{ role: 'user', content: 'Hello' }],
 *   temperature: 0.7
 * });
 * ```
 */
export async function callLLMApi(body: Record<string, any>): Promise<any> {
  // Ensure this is only called server-side
  if (typeof window !== 'undefined') {
    throw new Error(
      'callLLMApi can only be used on the server side. This must be called from API routes or Server Actions.'
    );
  }

  try {
    const apiUrl = getLLMApiUrl();

    // Prepare request headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add Authorization header if API key is provided
    if (process.env.LLM_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.LLM_API_KEY}`;
    }

    // Make the POST request
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });

    // Handle non-200 status codes with detailed error information
    if (!response.ok) {
      let errorBody: string;
      try {
        errorBody = await response.text();
      } catch {
        errorBody = 'Unable to read error response body';
      }

      throw new LLMApiError(
        `LLM API request failed: ${response.status} ${response.statusText}`,
        response.status,
        errorBody
      );
    }

    // Parse and return the JSON response
    try {
      const data = await response.json();
      return data;
    } catch (parseError) {
      throw new Error(
        `Failed to parse LLM API response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`
      );
    }
  } catch (error: any) {
    // Re-throw LLMApiError as-is (it already has all the context)
    if (error instanceof LLMApiError) {
      throw error;
    }

    // Handle network connection errors
    if (error instanceof Error) {
      if (
        error.message.includes('fetch failed') ||
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('ENOTFOUND') ||
        error.message.includes('ECONNRESET')
      ) {
        const apiUrl = process.env.LLM_API_URL || 'http://localhost:11434/api/generate';
        throw new Error(
          `Failed to connect to LLM API at ${apiUrl}. Please verify the service is running and the URL is correct.`
        );
      }
      throw error;
    }

    // Handle unknown errors
    throw new Error(`LLM API request failed: ${error?.message || 'Unknown error'}`);
  }
}

