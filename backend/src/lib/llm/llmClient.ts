'use server';

import 'server-only';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

/**
 * Get LLM API URL from environment variables
 * @returns The LLM API base URL
 * @throws Error if LLM_API_URL is not set
 */
function getLLMApiUrl(): string {
  const llmApiUrl = process.env.LLM_API_URL;

  if (!llmApiUrl) {
    throw new Error(
      'LLM_API_URL environment variable is required. Please set it in your .env.local file (e.g., LLM_API_URL=http://localhost:8000/v1).'
    );
  }

  // Ensure the URL doesn't have a trailing slash
  return llmApiUrl.replace(/\/$/, '');
}

/**
 * Generate a streaming response from the local LLM API
 * This function uses the standard fetch API to communicate with an OpenAI-compatible endpoint
 * and returns the raw Response.body as a ReadableStream for efficient relaying
 * 
 * @param messages Array of chat completion messages (using OpenAI types)
 * @returns Promise<ReadableStream<Uint8Array>> The raw response body stream
 * @throws Error if LLM_API_URL is not configured, if the request fails, or if the response is not streamable
 * 
 * @example
 * ```ts
 * import { generateStream } from '@/lib/llm/llmClient';
 * 
 * const stream = await generateStream([
 *   { role: 'user', content: 'Hello, how are you?' }
 * ]);
 * 
 * // Stream can be passed directly to Next.js Response
 * return new Response(stream, {
 *   headers: { 'Content-Type': 'text/event-stream' }
 * });
 * ```
 */
export async function generateStream(
  messages: ChatCompletionMessageParam[]
): Promise<ReadableStream<Uint8Array>> {
  try {
    const apiUrl = getLLMApiUrl();
    
    // Construct the endpoint URL
    // If LLM_API_URL already includes /v1, use it directly
    // Otherwise, append /chat/completions to the base URL
    const endpoint = apiUrl.includes('/v1')
      ? `${apiUrl}/chat/completions`
      : `${apiUrl}/v1/chat/completions`;

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
      model: process.env.LLM_MODEL || 'local-model',
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
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `LLM API request failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    // Verify that the response has a readable stream body
    if (!response.body) {
      throw new Error('LLM API response does not have a readable stream body');
    }

    // Return the raw Response.body as ReadableStream<Uint8Array>
    // This allows efficient relaying in Next.js API routes without buffering
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
    throw new Error(`LLM API request failed: ${error?.message || 'Unknown error'}`);
  }
}

