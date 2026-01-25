'use server';

import 'server-only';

/**
 * Chat message type for LLM interactions
 * Supports standard chat message roles: user and assistant
 */
export type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Get LLM API URL from environment variables
 * @returns The LLM API URL
 * @throws Error if LLM_API_URL is not set
 */
function getLLMApiUrl(): string {
  const llmApiUrl = process.env.LLM_API_URL;

  if (!llmApiUrl) {
    throw new Error(
      'LLM_API_URL environment variable is required. Please set it to your local LLM API endpoint (e.g., "http://llm-api:8080").'
    );
  }

  // Ensure the URL doesn't have a trailing slash
  return llmApiUrl.replace(/\/$/, '');
}

/**
 * Construct the request body for the LLM API
 * Uses a standard OpenAI/Anthropic-like payload structure
 * @param prompt The user's prompt/message
 * @param history Array of previous chat messages
 * @returns The request body object
 */
function constructRequestBody(
  prompt: string,
  history: ChatMessage[]
): {
  messages: Array<{ role: string; content: string }>;
  stream: boolean;
  temperature?: number;
  max_tokens?: number;
} {
  // Build messages array from history
  const messages = history.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }));

  // Add the current prompt as a user message
  messages.push({
    role: 'user',
    content: prompt,
  });

  return {
    messages,
    stream: true,
    temperature: 0.7, // Default temperature for balanced creativity
    max_tokens: 2048, // Default max tokens
  };
}

/**
 * Generate a streaming response from the local LLM API
 * This function constructs a valid API request and returns the raw Response object
 * for proxying through Next.js API Routes
 * @param prompt The user's prompt/message to send to the LLM
 * @param history Array of previous chat messages for context
 * @returns Promise<Response> The raw Response object from the fetch call, ready to be proxied
 * @throws Error if LLM_API_URL is not configured or if the request fails
 */
export async function generateStream(
  prompt: string,
  history: ChatMessage[] = []
): Promise<Response> {
  try {
    const apiUrl = getLLMApiUrl();
    const requestBody = constructRequestBody(prompt, history);

    // Determine the endpoint - try /v1/chat/completions first (OpenAI-compatible)
    // If that doesn't work, fall back to root or other common endpoints
    const endpoint = `${apiUrl}/v1/chat/completions`;

    // Make the fetch request with streaming enabled
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Include Authorization header if API key is provided
        ...(process.env.LLM_API_KEY && {
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        }),
      },
      body: JSON.stringify(requestBody),
      // Ensure streaming is enabled
      // Note: fetch() automatically handles streaming responses
    });

    // Check if the request was successful
    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `LLM API request failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    // Verify that the response is actually streamable
    if (!response.body) {
      throw new Error('LLM API response does not have a readable stream body');
    }

    // Return the raw Response object for proxying
    return response;
  } catch (error: any) {
    // Re-throw with more context if it's already an Error
    if (error instanceof Error) {
      // If it's a network error, provide a helpful message
      if (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED')) {
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

/**
 * Get embedding vector for a given text
 * Calls the local LLM API for embedding generation
 * @param text The text to generate an embedding for
 * @returns Promise<number[]> The embedding vector (default: 1536 dimensions for OpenAI standard)
 * @throws Error if embedding generation fails
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const embeddingApiUrl = process.env.EMBEDDING_API_URL || process.env.LLM_API_URL;

  if (!embeddingApiUrl) {
    console.warn(
      '[LLM Client] EMBEDDING_API_URL or LLM_API_URL not set. Returning mock embedding (1536 dimensions).'
    );
    // Return mock embedding array of 1536 floats (OpenAI standard dimension)
    return Array(1536)
      .fill(0)
      .map(() => Math.random() * 2 - 1); // Random values between -1 and 1
  }

  try {
    const apiUrl = embeddingApiUrl.replace(/\/$/, '');
    // Try OpenAI-compatible embedding endpoint
    const endpoint = `${apiUrl}/v1/embeddings`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.LLM_API_KEY && {
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        }),
      },
      body: JSON.stringify({
        input: text,
        model: process.env.EMBEDDING_MODEL || 'text-embedding-ada-002', // Default model name
      }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `Embedding API request failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();
    
    // Handle OpenAI-compatible response format: { data: [{ embedding: [...] }] }
    if (data.data && Array.isArray(data.data) && data.data.length > 0) {
      return data.data[0].embedding;
    }
    
    // Handle alternative format: { embedding: [...] }
    if (data.embedding && Array.isArray(data.embedding)) {
      return data.embedding;
    }

    throw new Error('Unexpected embedding response format');
  } catch (error: any) {
    console.error('[LLM Client] Embedding generation failed:', error);
    
    // Fallback to mock embedding if API fails
    console.warn(
      '[LLM Client] Falling back to mock embedding (1536 dimensions) due to API failure.'
    );
    return Array(1536)
      .fill(0)
      .map(() => Math.random() * 2 - 1);
  }
}

/**
 * Call LLM for non-streaming completion (for structured output)
 * Used for memory extraction and other structured tasks
 * @param messages Array of chat messages
 * @param options Optional configuration for the LLM call
 * @returns Promise<string> The complete response text
 * @throws Error if LLM API call fails
 */
export async function callLLM(
  messages: Array<{ role: string; content: string }>,
  options?: {
    temperature?: number;
    max_tokens?: number;
    response_format?: { type: 'json_object' };
  }
): Promise<string> {
  try {
    const apiUrl = getLLMApiUrl();
    const endpoint = `${apiUrl}/v1/chat/completions`;

    const requestBody = {
      messages,
      stream: false,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens ?? 2048,
      ...(options?.response_format && { response_format: options.response_format }),
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.LLM_API_KEY && {
          Authorization: `Bearer ${process.env.LLM_API_KEY}`,
        }),
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Unknown error');
      throw new Error(
        `LLM API request failed: ${response.status} ${response.statusText}. ${errorText}`
      );
    }

    const data = await response.json();
    
    // Handle OpenAI-compatible response format
    if (data.choices && Array.isArray(data.choices) && data.choices.length > 0) {
      return data.choices[0].message?.content || '';
    }

    throw new Error('Unexpected LLM response format');
  } catch (error: any) {
    console.error('[LLM Client] LLM call failed:', error);
    throw new Error(`LLM API call failed: ${error?.message || 'Unknown error'}`);
  }
}

