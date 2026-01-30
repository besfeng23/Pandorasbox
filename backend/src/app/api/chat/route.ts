import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToModelMessages, tool, type UIMessage } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { embedText } from '@/lib/ai/embedding';
import { searchPoints, upsertPoint } from '@/lib/sovereign/qdrant-client';
import { completeInference } from '@/lib/sovereign/inference';
import { v4 as uuidv4 } from 'uuid';

// Configure OpenAI provider with custom URL if set
// Ensure we handle the /v1 suffix correctly for vLLM/OpenAI-compatible endpoints
const getBaseUrl = () => {
  const url = process.env.INFERENCE_URL || process.env.LLM_API_URL;
  if (!url) return undefined;
  if (!url.endsWith('/v1') && !url.includes('/chat')) {
    return `${url}/v1`;
  }
  return url;
};

const finalBaseUrl = getBaseUrl();
console.log('[Chat Route] Initializing OpenAI with BaseURL:', finalBaseUrl);

if (!finalBaseUrl) {
  console.warn('[Chat Route] WARNING: No INFERENCE_URL or LLM_API_URL set. Defaulting to OpenAI (this will fail without a valid public API Key).');
}

const openai = createOpenAI({
  baseURL: finalBaseUrl,
  apiKey: process.env.LLM_API_KEY || 'dummy-key',
});

export const maxDuration = 60; // Allow 60 seconds for generation

// Helper: Phase 14 - Distributed Subnetworks Router
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
    // 1. Authenticate User
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split('Bearer ')[1];

    // Verify token using Firebase Admin
    const auth = getAuthAdmin();
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch (e) {
      console.error(`[${requestId}] Token verification failed:`, e);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
    timings.auth_ok = Date.now();

    const userId = decodedToken.uid;

    // 5. Pre-flight Check: Verify Inference Server is Reachable
    timings.inference_start = Date.now();
    try {
      const checkUrl = `${finalBaseUrl}/models`; // Standard OpenAI/Ollama check
      const checkController = new AbortController();
      const checkTimeout = setTimeout(() => checkController.abort(), 1000); // 1s timeout

      const checkRes = await fetch(checkUrl, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${process.env.LLM_API_KEY || 'dummy-key'}` },
        signal: checkController.signal
      });
      clearTimeout(checkTimeout);

      if (!checkRes.ok && checkRes.status !== 401 && checkRes.status !== 404) {
        // 401/404 might mean the endpoint differs but server is up. 500/Connection Refused is bad.
        console.warn(`[${requestId}] Inference server might be unhealthy: ${checkRes.status}`);
      }
    } catch (connError: any) {
      console.error(`[${requestId}] Inference Server Unreachable (${finalBaseUrl}):`, connError.message);
      return NextResponse.json(
        { error: `Inference Server Unreachable: ${connError.message}. Check VPC/VPN connection.` },
        { status: 503 }
      );
    }

    console.log(`[${requestId}] Starting Inference. Timings:`, JSON.stringify({
      uid: userId,
      agent: agentId,
      auth_ms: timings.auth_ok - timings.start,
      db_ms: timings.firestore_write_ok - timings.auth_ok,
      rag_ms: timings.memory_search_end - timings.memory_search_start,
      route_ms: timings.routing_end - timings.routing_start
    }));

    const result = await streamText({);
    // 2. Parse Body
    const body = await req.json();
    const { message, agentId = 'universe', threadId, history = [], attachments = [], workspaceId, useVision = false } = body;

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }
    if (!threadId) {
      return NextResponse.json({ error: 'Thread ID is required' }, { status: 400 });
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

    if (attachments && attachments.length > 0) {
      attachments.forEach((att: any) => {
        if (att.type.startsWith('image/')) {
          userContent.push({
            type: 'image',
            image: att.base64 || att.url,
          });
        }
      });
    }

    const messages = [...initialMessages, { role: 'user', content: userContent } as const];

    // ... (rest of the code)

    // ...

  } catch (error: any) {
    console.error(`[${requestId}] Chat API Fatal Error:`, error);
    console.error(`[${requestId}] Stack Trace:`, error.stack); // Log stack trace
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}
