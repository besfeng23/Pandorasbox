import { NextRequest, NextResponse } from 'next/server';
import { streamChatCompletion, type ChatMessage } from '@/lib/llm/llm-client';
import { handleOptions, corsHeaders } from '@/lib/cors';

/**
 * Handle OPTIONS requests for CORS preflight
 */
export async function OPTIONS() {
  return handleOptions();
}

/**
 * POST /api/chat
 * Streaming chat API route that proxies requests to the local LLM
 * 
 * Request body:
 * {
 *   prompt: string;           // Required: The user's message/prompt
 *   history?: ChatMessage[];  // Optional: Previous chat messages for context
 * }
 * 
 * Returns: Streaming response with Server-Sent Events (SSE) format
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Ensure request method is POST (Next.js routes handle this, but we can verify)
    if (request.method !== 'POST') {
      return NextResponse.json(
        { error: 'Method not allowed. Only POST is supported.' },
        { status: 405, headers: corsHeaders() }
      );
    }

    // 2. Parse JSON request body
    let body: { prompt?: string; history?: ChatMessage[] };
    try {
      body = await request.json();
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid JSON in request body' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // 3. Extract prompt and history from request body
    const { prompt, history } = body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return NextResponse.json(
        { error: 'prompt is required and must be a non-empty string' },
        { status: 400, headers: corsHeaders() }
      );
    }

    // Validate history if provided
    if (history !== undefined) {
      if (!Array.isArray(history)) {
        return NextResponse.json(
          { error: 'history must be an array of ChatMessage objects' },
          { status: 400, headers: corsHeaders() }
        );
      }

      // Validate each message in history
      for (const msg of history) {
        if (!msg || typeof msg !== 'object') {
          return NextResponse.json(
            { error: 'Each message in history must be a ChatMessage object' },
            { status: 400, headers: corsHeaders() }
          );
        }
        if (msg.role !== 'user' && msg.role !== 'assistant') {
          return NextResponse.json(
            { error: 'Message role must be either "user" or "assistant"' },
            { status: 400, headers: corsHeaders() }
          );
        }
        if (!msg.content || typeof msg.content !== 'string') {
          return NextResponse.json(
            { error: 'Message content must be a non-empty string' },
            { status: 400, headers: corsHeaders() }
          );
        }
      }
    }

    // 4. Build messages array from history and current prompt
    const messages: ChatMessage[] = [
      ...(history || []),
      { role: 'user', content: prompt },
    ];

    // 5. Call streamChatCompletion to get the streaming response from LLM
    const llmResponse = await streamChatCompletion(messages);

    // 6. Verify the response has a readable body
    if (!llmResponse.body) {
      console.error('[Chat API] LLM response does not have a readable stream body');
      return NextResponse.json(
        { error: 'LLM API returned a response without a streamable body' },
        { status: 500, headers: corsHeaders() }
      );
    }

    // 7. Proxy the raw response body with SSE headers
    return new Response(llmResponse.body, {
      status: 200,
      headers: {
        ...corsHeaders(),
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        // Preserve any additional headers from the LLM response if needed
        ...(llmResponse.headers.get('X-Request-ID') && {
          'X-Request-ID': llmResponse.headers.get('X-Request-ID')!,
        }),
      },
    });
  } catch (error: any) {
    // 8. Error handling - return 500 status for LLM API connection failures
    console.error('[Chat API] Error processing chat request:', error);

    // Provide user-friendly error messages
    let errorMessage = 'Failed to process chat request';
    let statusCode = 500;

    if (error instanceof Error) {
      errorMessage = error.message;

      // Check for specific error types
      if (error.message.includes('LLM_API_URL') || error.message.includes('connect to LLM API')) {
        errorMessage = 'LLM service is unavailable. Please check the service status.';
        statusCode = 503; // Service Unavailable
      } else if (error.message.includes('LLM API request failed')) {
        errorMessage = 'LLM API request failed. Please try again.';
        statusCode = 502; // Bad Gateway
      }
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: statusCode, headers: corsHeaders() }
    );
  }
}
