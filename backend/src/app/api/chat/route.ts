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
  if (url.endsWith('/v1')) return url;
  if (url.includes('/') && !url.match(/:\d+$/)) {
    return url.endsWith('/') ? url.slice(0, -1) + '/v1' : url + '/v1';
  }
  return `${url}/v1`;
};

const getOpenAIModel = () => {
  const finalBaseUrl = getBaseUrl();
  console.log('[Phase 16] Execution Node Active: Initializing OpenAI with BaseURL:', finalBaseUrl);

  return createOpenAI({
    baseURL: finalBaseUrl,
    // @ts-ignore compatibility mode
    compatibility: 'compatible',
    headers: {
      'Authorization': `Bearer ${process.env.SOVEREIGN_KEY || 'empty'}`,
      'x-vercel-ai-provider': 'openai'
    },
    apiKey: process.env.SOVEREIGN_KEY || 'empty',
  });
};

function enhanceWithCognition(results: any[]): string {
  if (!Array.isArray(results) || results.length === 0) return '';
  const facts = results.filter(r => (r.payload?.type === 'fact' || r.score > 0.85));
  const interactions = results.filter(r => !r.payload?.type && r.score <= 0.85);
  let contextBlock = "\n\n### 🧠 UNIFIED COGNITION STREAM (Phase 13)";
  if (facts.length > 0) contextBlock += "\n**Established Facts:**\n" + (facts || []).map(r => `• ${r.payload?.content || ''}`).join('\n');
  if (interactions.length > 0) contextBlock += "\n**Relevant Echoes:**\n" + (interactions || []).map(r => `• ${r.payload?.content || ''}`).join('\n');
  return contextBlock;
}

const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: T, name: string): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => { console.warn(`[Timeout] ${name} timed out after ${ms}ms`); resolve(fallback); }, ms))
  ]);
};

export async function POST(req: NextRequest) {
  const requestId = uuidv4();

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }
    const token = authHeader.split('Bearer ')[1];
    const auth = getAuthAdmin();
    const decodedToken = await auth.verifyIdToken(token);
    const userId = decodedToken.uid;

    const body = await req.json();
    const { message, agentId = 'universe', threadId, history = [], workspaceId } = body;

    const db = getFirestoreAdmin();
    const userMessageRef = db.collection(`users/${userId}/agents/${agentId}/history`).doc();
    await userMessageRef.set({
      role: 'user',
      content: message,
      threadId,
      workspaceId: workspaceId || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    let context = '';
    if (message.length > 5) {
      try {
        const ragPromise = async () => {
          const queryVector = await embedText(message);
          const filter: any = { must: [{ key: 'userId', match: { value: userId } }, { key: 'agentId', match: { value: agentId } }] };
          if (workspaceId) filter.must.push({ key: 'workspaceId', match: { value: workspaceId } });
          const searchResults = (await searchPoints('memories', queryVector, 5, filter)) || [];
          return enhanceWithCognition(searchResults);
        };
        context = await withTimeout(ragPromise(), 2000, '', 'RAG Search');
      } catch (e: any) { console.error(`[${requestId}] RAG Error:`, e.message); }
    }

    let routingInfo = '';
    try {
      if (/(code|function)/i.test(message)) routingInfo = '\n\n### 📡 ACTIVE SUBNETWORK: CODER_LANE';
    } catch (e) { }

    const openaiProvider = getOpenAIModel();
    const modelName = process.env.INFERENCE_MODEL || 'llama3.2:latest';

    const systemPrompt = `You are Pandora, an advanced Sovereign AI assistant.
### Capabilities:
- **Memory**: You have access to long-term memory.
${agentId === 'builder' ? `
### Role: THE BUILDER 🏗️
- **Expertise**: Full-stack engineering.
` : `
### Role: THE UNIVERSE 🌌
- **Expertise**: Creative synthesis.
`}
${routingInfo}
User ID: ${userId}${context}`;

    const cleanHistory = Array.isArray(history) ? history.filter(m => m.role && m.content) : [];

    const uiMessages = [
      ...cleanHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message }
    ];

    const result = await streamText({
      model: openaiProvider(modelName),
      system: systemPrompt,
      messages: uiMessages as any,
      onFinish: async ({ text: completion }) => {
        try {
          const assistantMessageRef = db.collection(`users/${userId}/agents/${agentId}/history`).doc();
          await assistantMessageRef.set({
            role: 'assistant',
            content: completion,
            threadId,
            workspaceId: workspaceId || null,
            createdAt: FieldValue.serverTimestamp(),
          });
          db.doc(`users/${userId}/threads/${threadId}`).update({ updatedAt: FieldValue.serverTimestamp() }).catch(e => { });
        } catch (e) { }
      }
    });

    return result.toTextStreamResponse({ headers: corsHeaders() });

  } catch (error: any) {
    console.error(`[${requestId}] Chat API Fatal Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
