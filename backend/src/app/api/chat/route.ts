import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToModelMessages, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { embedText } from '@/lib/ai/embedding';
import { searchPoints, upsertPoint } from '@/lib/sovereign/qdrant-client';
import { completeInference } from '@/lib/sovereign/inference';
import { v4 as uuidv4 } from 'uuid';
import { handleOptions, corsHeaders } from '@/lib/cors';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function OPTIONS() {
  return handleOptions();
}

const getBaseUrl = () => {
  const url = process.env.INFERENCE_URL || process.env.INFERENCE_BASE_URL || 'http://localhost:8000';
  // Ollama uses port 11434 and requires /v1 for OpenAI-compatible API
  // vLLM uses port 8000 and requires /v1 for OpenAI-compatible API
  // Ensure we always append /v1 if not present
  if (url.endsWith('/v1')) {
    return url;
  }
  // Don't add /v1 if URL already ends with a path (e.g., /api)
  if (url.includes('/') && !url.match(/:\d+$/)) {
    return url.endsWith('/') ? url.slice(0, -1) + '/v1' : url + '/v1';
  }
  return `${url}/v1`;
};

// Configure OpenAI-compatible provider to point ONLY at local vLLM.
const getOpenAIModel = () => {
  const finalBaseUrl = getBaseUrl();
  // Unified Telemetry Block
  console.log('[Phase 15] Execution Node Active: Initializing OpenAI with BaseURL:', finalBaseUrl);

  return createOpenAI({
    baseURL: finalBaseUrl,
    // vLLM OpenAI-compatible endpoints ignore the API key by default; we keep a constant for protocol compatibility.
    apiKey: process.env.SOVEREIGN_KEY || 'empty',
  });
};

// Helper: Phase 14 - Distributed Subnetworks Router
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function detectSubnetwork(message: string): string {
  const lower = message.toLowerCase();

  if (/(code|function|react|typescript|bug|error|api|component|hook|database|query|deploy)/.test(lower)) {
    return 'SUB_NETWORK::CODER_LANE';
  }
  if (/(story|poem|essay|draft|write a|creative|narrative|scene)/.test(lower)) {
    return 'SUB_NETWORK::WRITER_LANE';
  }
  if (/(analyze|compare|difference|why|reason|evaluate|pros and cons|impact)/.test(lower)) {
    return 'SUB_NETWORK::ANALYST_LANE';
  }
  if (/(reflect|think|ponder|what does this mean|implication)/.test(lower)) {
    return 'SUB_NETWORK::PHILOSOPHER_LANE';
  }

  return 'SUB_NETWORK::GENERAL_ROUTER';
}

// Helper: Phase 13 - Unified Cognition (Structured Context)
function enhanceWithCognition(results: any[]): string {
  if (!Array.isArray(results) || results.length === 0) return '';

  // Simple classification of memories
  const facts = results.filter(r => (r.payload?.type === 'fact' || r.score > 0.85));
  const interactions = results.filter(r => !r.payload?.type && r.score <= 0.85);

  let contextBlock = "\n\n### 🧠 UNIFIED COGNITION STREAM (Phase 13)";

  if (facts.length > 0) {
    contextBlock += "\n**Established Facts:**\n" + (facts || []).map(r => `• ${r.payload?.content || ''}`).join('\n');
  }

  if (interactions.length > 0) {
    contextBlock += "\n**Relevant Echoes:**\n" + (interactions || []).map(r => `• ${r.payload?.content || ''}`).join('\n');
  }

  return contextBlock;
}

// Helper: Timeout wrapper for best-effort operations
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T, name: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) =>
      setTimeout(() => {
        console.warn(`[Timeout] ${name} timed out after ${ms}ms`);
        resolve(fallback);
      }, ms)
    )
  ]);
};

export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  const timings: Record<string, number> = { start: Date.now() };

  try {
    // 0. Debug & Environment Check
    const activeBaseUrl = getBaseUrl();
    const apiKey = process.env.SOVEREIGN_KEY || 'empty';

    // 1. Authenticate User
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.warn(`[${requestId}] 401 Unauthorized: Missing or invalid Authorization header. Received:`, authHeader);
      return NextResponse.json({ error: 'Unauthorized: Missing Authorization header' }, { status: 401, headers: corsHeaders() });
    }
    const token = authHeader.split('Bearer ')[1];

    // Verify token using Firebase Admin
    const auth = getAuthAdmin();
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (e: any) {
      console.error(`[${requestId}] Token verification failed:`, e.message);
      return NextResponse.json({ error: `Invalid token: ${e.message}` }, { status: 401, headers: corsHeaders() });
    }
    timings.auth_ok = Date.now();

    const userId = decodedToken.uid;

    // 2. Parse Body
    const body = await req.json();
    const { message, agentId = 'universe', threadId, history = [], attachments = [], workspaceId, useVision = false } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400, headers: corsHeaders() });
    }
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400, headers: corsHeaders() });
    }

    // 3. Save User Message to Firestore
    const db = getFirestoreAdmin();
    // Use fallback for history if null
    const safeHistory = Array.isArray(history) ? history : [];

    const userMessageRef = db.collection(`users/${userId}/agents/${agentId}/history`).doc();
    const userMessageData = {
      role: 'user',
      content: message,
      threadId,
      workspaceId: workspaceId || null,
      createdAt: FieldValue.serverTimestamp(),
    };

    // Make Firestore write non-blocking for speed, but catch errors
    // Actually, for consistency we usually wait, but we can race it if needed.
    // Let's keep it awaited for data integrity but log the time.
    await userMessageRef.set(userMessageData);
    timings.firestore_write_ok = Date.now();

    // 4. Prepare Context for LLM
    const safeHistoryArray = (Array.isArray(safeHistory) ? safeHistory : [])
      .filter(item => item && typeof item === 'object');

    // Defensive message conversion
    let initialMessages: any[] = [];
    try {
      initialMessages = await convertToModelMessages(safeHistoryArray);
    } catch (conversionError) {
      console.error(`[${requestId}] Message conversion failed:`, conversionError);
      // Fallback: Drop history if conversion fails to prevent crash
      initialMessages = [];
    }

    const userContent: any[] = [{ type: 'text', text: message }];

    // Sovereign default: ignore images unless your local model is explicitly multimodal.
    // This prevents accidental routing to non-local "vision" backends.

    const messages = [...initialMessages, { role: 'user', content: userContent } as const];

    // 4.5 RAG: Search for relevant context (Phase 13 Implementation)
    // Wrapped in Best-Effort Timeout (2000ms)
    let context = '';
    timings.memory_search_start = Date.now();
    console.log(`[${requestId}] Starting RAG search, message length: ${message.length}`);

    if (message.length > 5) {
      try {
        const ragPromise = async () => {
          console.log(`[${requestId}] Embedding query text for RAG search`);
          const queryVector = await embedText(message);
          console.log(`[${requestId}] Query vector generated, length: ${queryVector.length}`);
          
          const filter: any = {
            must: [
              { key: 'userId', match: { value: userId } },
              { key: 'agentId', match: { value: agentId } }
            ]
          };

          if (workspaceId) {
            filter.must.push({ key: 'workspaceId', match: { value: workspaceId } });
          }

          console.log(`[${requestId}] Searching Qdrant with filter:`, JSON.stringify(filter));
          const searchResults = (await searchPoints('memories', queryVector, 5, filter)) || [];
          console.log(`[${requestId}] RAG search returned ${searchResults.length} results`);
          const enhanced = enhanceWithCognition(Array.isArray(searchResults) ? searchResults : []);
          console.log(`[${requestId}] Enhanced context length: ${enhanced.length}`);
          return enhanced;
        };

        context = await withTimeout(ragPromise(), 2000, '', 'RAG Search');
      } catch (ragError: any) {
        console.error(`[${requestId}] RAG Search failed:`, {
          error: ragError.message,
          stack: ragError.stack?.substring(0, 200)
        });
      }
    } else {
      console.log(`[${requestId}] Skipping RAG search (message too short)`);
    }
    timings.memory_search_end = Date.now();
    console.log(`[${requestId}] RAG search completed in ${timings.memory_search_end - timings.memory_search_start}ms`);

    // 4.8 Phase 14: Subnetwork Routing (Semantic)
    // Wrapped in Best-Effort Timeout (1500ms)
    let routingInfo = '';
    timings.routing_start = Date.now();
    try {
      const { routeQuery } = await import('@/lib/ai/router');
      const routeResult = await withTimeout(
        routeQuery(message),
        1500,
        { agentId: agentId, confidence: 0, reasoning: 'Timeout Fallback' },
        'Router'
      );

      routingInfo = `\n\n### 📡 ACTIVE SUBNETWORK: ${routeResult.agentId.toUpperCase()}_LANE\n(Router: ${routeResult.reasoning})`;
    } catch (routeError: any) {
      // Ignore routing errors in logs unless critical
      if (routeError?.message !== 'Timeout Fallback') {
        console.warn(`[${requestId}] Routing skipped:`, routeError.message);
      }
    }
    timings.routing_end = Date.now();

    // 5. Pre-flight Check: Verify Inference Server is Reachable
    timings.inference_start = Date.now();
    try {
      const checkUrl = `${activeBaseUrl}/models`; // OpenAI-compatible health check
      const checkController = new AbortController();
      const checkTimeout = setTimeout(() => checkController.abort(), 1000); // 1s timeout

      const checkRes = await fetch(checkUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${apiKey}` },
        signal: checkController.signal
      });
      clearTimeout(checkTimeout);

      if (!checkRes.ok && checkRes.status !== 401 && checkRes.status !== 404) {
        console.warn(`[${requestId}] Inference server might be unhealthy: ${checkRes.status}`);
      }
    } catch (connError: any) {
      console.error(`[${requestId}] Inference Server Unreachable (${activeBaseUrl}):`, connError.message);
      return NextResponse.json(
        { error: `Inference System Offline - Check Container. Details: ${connError.message}` },
        { status: 503, headers: corsHeaders() }
      );
    }

    // 5. Stream from LLM
    console.log(`[${requestId}] Starting Inference. Timings:`, JSON.stringify({
      uid: userId,
      agent: agentId,
      auth_ms: timings.auth_ok - timings.start,
      db_ms: timings.firestore_write_ok - timings.auth_ok,
      rag_ms: timings.memory_search_end - timings.memory_search_start,
      route_ms: timings.routing_end - timings.routing_start,
      inference_url: activeBaseUrl || 'default'
    }));

    const openaiModel = getOpenAIModel(); // Call the getter here
    
    // Validate that we have a valid model configuration
    if (!activeBaseUrl && !apiKey) {
      console.error(`[${requestId}] CRITICAL: No inference URL and no API key`);
      return NextResponse.json(
        { error: 'Inference server not configured. Please set INFERENCE_URL environment variable.' },
        { status: 503, headers: corsHeaders() }
      );
    }

    let result;
    const modelName = process.env.INFERENCE_MODEL || 'mistral';
    console.log(`[${requestId}] Using model: ${modelName}, BaseURL: ${activeBaseUrl}`);
    try {
      result = await streamText({
      model: openaiModel(modelName),
      messages,
      tools: {
        generate_artifact: tool({
          description: 'Generate a high-quality artifact such as code, a document, an SVG, or a diagram. Use this for significant pieces of work that should be viewed in a separate panel.',
          inputSchema: z.object({
            title: z.string().describe('The title of the artifact'),
            type: z.enum(['code', 'markdown', 'html', 'svg', 'react']).describe('The type of artifact'),
            language: z.string().optional().describe('The programming language (if applicable)'),
            content: z.string().describe('The full content of the artifact'),
          }),
          execute: async ({ title, type, content, language }: { title: string, type: 'code' | 'markdown' | 'html' | 'svg' | 'react', content: string, language?: string }) => {
            try {
              const db = getFirestoreAdmin();
              const artifactRef = db.collection('artifacts').doc();
              const id = artifactRef.id;
              await artifactRef.set({
                id,
                title,
                type,
                content,
                language: language || '',
                userId,
                threadId,
                workspaceId: workspaceId || null,
                createdAt: FieldValue.serverTimestamp(),
              });
              return { success: true, artifactId: id, message: 'Artifact generated and saved.' };
            } catch (error: any) {
              return { success: false, error: error.message };
            }
          },
        }),
      },
      system: `You are Pandora, an advanced Sovereign AI assistant running in a fully local/private environment.

### Capabilities:
- **Memory**: You have access to long-term memory (Unified Cognition).
- **Artifacts**: You can generate documents and code artifacts.


${agentId === 'builder' ? `
### Role: THE BUILDER 🏗️
- **Expertise**: Full-stack engineering, Cloud Architecture, POSIX compliance, and Low-latency systems.
- **Tone**: Precise, technical, and constructive.
- **Workflow**:
  1. Analyze requirements.
  2. Plan architecture using modular patterns.
  3. Provide production-ready, typed code.
  4. Explain design decisions and trade-offs.
` : `
### Role: THE UNIVERSE 🌌
- **Expertise**: Creative synthesis, Philosophical inquiry, Deep Knowledge exploration.
- **Tone**: Wise, expansive, and poetic yet grounded.
- **Workflow**:
  1. Listen deeply to the user's intent.
  2. Synthesize information from multiple domains.
  3. Offer provocative insights.
`}
${routingInfo}

### Operational Guardrails:
- **Privacy**: You are private and sovereign. Do not disclose user memories unless relevant.
- **Integrity**: Cite your sources if relevant context is provided below.
- **Format**: Use clean Markdown with bold headers.

User ID: ${userId}${context}`,
      temperature: 0.7,
      onFinish: async ({ text }) => {
        try {
          const assistantMessageRef = db.collection(`users/${userId}/agents/${agentId}/history`).doc();
          await assistantMessageRef.set({
            role: 'assistant',
            content: text,
            threadId,
            workspaceId: workspaceId || null,
            createdAt: FieldValue.serverTimestamp(),
          });

          // Use non-blocking update
          db.doc(`users/${userId}/threads/${threadId}`).update({
            updatedAt: FieldValue.serverTimestamp(),
          }).catch(e => console.error('Failed to update thread timestamp:', e));

          // Automated Long-term Memory (Consolidated Memory)
          if (text.length > 50) {
            // FIRE AND FORGET - Do not await memory consolidation
            (async () => {
              try {
                const summaryPrompt = [
                  { role: 'system' as const, content: 'You are a memory consolidation expert. Summarize the following exchange into a single, high-density factual statement for long-term storage.' },
                  { role: 'user' as const, content: `User: ${message}\nAssistant: ${text}` }
                ];
                const summary = await completeInference(summaryPrompt);

                if (summary) {
                  const summaryVector = await embedText(summary);
                  await upsertPoint('memories', {
                    id: uuidv4(),
                    vector: summaryVector,
                    payload: {
                      content: summary,
                      userId,
                      agentId,
                      workspaceId: workspaceId || null,
                      type: 'consolidated_memory',
                      source: 'chat_auto',
                      createdAt: new Date().toISOString()
                    }
                  });
                  console.log(`[${requestId}] Automated memory consolidated.`);
                }
              } catch (memoryError) {
                console.error(`[${requestId}] Failed to consolidate memory:`, memoryError);
              }
            })();
          }
        } catch (saveError) {
          console.error(`[${requestId}] Failed to save assistant message:`, saveError);
        }
      },
    });
    } catch (inferenceError: any) {
      console.error(`[${requestId}] Inference Error:`, inferenceError);
      console.error(`[${requestId}] Inference Error Details:`, {
        message: inferenceError.message,
        stack: inferenceError.stack,
        cause: inferenceError.cause,
        baseUrl: activeBaseUrl,
        model: process.env.INFERENCE_MODEL || 'mistral'
      });
      
      // Extract more specific error information
      let errorMessage = inferenceError.message || 'Unknown error';
      let userFriendlyMessage = errorMessage;
      
      // Check for common error patterns
      if (errorMessage.includes('model') && errorMessage.includes('not found')) {
        userFriendlyMessage = `Model not found: The model '${process.env.INFERENCE_MODEL || 'mistral'}' is not available. Please check your Ollama/vLLM installation and ensure the model is pulled/loaded.`;
      } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('Connection refused')) {
        userFriendlyMessage = `Connection refused: Cannot reach inference server at ${activeBaseUrl}. Check VPC connector and ensure the service is running.`;
      } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
        userFriendlyMessage = `Request timeout: The inference server did not respond in time. The service may be overloaded or unavailable.`;
      }
      
      return NextResponse.json(
        { 
          error: userFriendlyMessage,
          details: process.env.NODE_ENV === 'development' ? {
            originalError: errorMessage,
            baseUrl: activeBaseUrl,
            model: process.env.INFERENCE_MODEL || 'mistral',
            stack: inferenceError.stack
          } : undefined
        },
        { status: 503, headers: corsHeaders() }
      );
    }

    if (!result) {
      console.error(`[${requestId}] CRITICAL: streamText returned null/undefined`);
      return NextResponse.json(
        { error: 'Failed to initialize inference stream' },
        { status: 500, headers: corsHeaders() }
      );
    }

    console.log(`[${requestId}] Stream initialized successfully`);
    return result.toUIMessageStreamResponse();

  } catch (error: any) {
    console.error(`[${requestId}] Chat API Fatal Error:`, error);
    console.error(`[${requestId}] Stack Trace:`, error.stack); // Log stack trace
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
