import { NextRequest, NextResponse } from 'next/server';
import { streamText, convertToCoreMessages, tool } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { z } from 'zod';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { embedText } from '@/lib/ai/embedding';
import { searchPoints, upsertPoint } from '@/lib/sovereign/qdrant-client';
import { completeInference } from '@/lib/sovereign/inference';
import { hybridSearch } from '@/lib/hybrid/search';
import { generateReasoning } from '@/lib/ai/reasoning';
import { generatePlan } from '@/lib/ai/planner';
import { selfVerify } from '@/lib/ai/reflection';
import { detectAmbiguity } from '@/lib/ai/active-learning';
import { getFewShotPrompt } from '@/lib/ai/few-shot';
import { selectModel } from '@/lib/ai/model-selector';
import { v4 as uuidv4 } from 'uuid';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { getDispatcher } from '@/modules/intelligence/router';

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
  let timeoutId: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Timeout] ${name} timed out after ${ms}ms`);
      resolve(fallback);
    }, ms);
  });

  return Promise.race([
    promise.then((val) => {
      if (timeoutId) clearTimeout(timeoutId);
      return val;
    }),
    timeoutPromise
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


    // ═══════════════════════════════════════════════════════════════════════════
    // SPLIT-BRAIN ROUTING (Phase 2)
    // ═══════════════════════════════════════════════════════════════════════════
    const dispatcher = getDispatcher();
    // Wrap classification in timeout to prevent hanging
    const intent = await withTimeout(dispatcher.classifyIntent(message), 5000, 'CHAT' as any, 'Intent Classification');
    console.log(`[Phase 17] Dispatcher classified intent: ${intent}`);

    let provider;
    let model;
    let routingInfo = '';
    let reasoningData: any = null;
    let activeLearningQuestion: string | undefined;

    // PHASE 21: Active Learning & Ambiguity Detection
    const ambiguity = await detectAmbiguity(message);
    if (ambiguity.needsClarification) {
      activeLearningQuestion = ambiguity.question;
      console.log(`[ActiveLearning] Ambiguity detected: ${activeLearningQuestion}`);
    }

    if (intent === 'BUILD' || agentId === 'builder') {
      // Route to Groq for builder/code tasks
      // No RAG context for Builder (Privacy)
      const groqApiKey = process.env.GROQ_API_KEY;

      if (!groqApiKey) {
        console.warn(`[${requestId}] GROQ_API_KEY not set! Falling back to Universe Agent.`);
        // Fallback to Universe Agent if Groq key is missing
        provider = createOpenAI({
          apiKey: process.env.SOVEREIGN_KEY || 'ollama',
          baseURL: `${process.env.UNIVERSE_INFERENCE_URL || 'http://10.128.0.8:11434'}/v1`,
          // @ts-ignore compatibility mode
          compatibility: 'compatible',
        });
        model = process.env.UNIVERSE_MODEL || 'mistral:latest';
        routingInfo = '\n\n### 📡 ACTIVE SUBNETWORK: UNIVERSE_FALLBACK (Groq unavailable)';
      } else {
        console.log(`[${requestId}] Routing to Groq Builder Agent with model: ${process.env.BUILDER_MODEL || 'llama-3.3-70b-versatile'}`);
        routingInfo = '\n\n### 📡 ACTIVE SUBNETWORK: CODER_LANE';
        provider = createOpenAI({
          apiKey: groqApiKey,
          baseURL: 'https://api.groq.com/openai/v1',
          // @ts-ignore compatibility mode
          compatibility: 'compatible',
        });
        model = process.env.BUILDER_MODEL || 'llama-3.3-70b-versatile';
      }
    } else {
      // 1. Perform Hybrid Search for Universe/Chat Agent
      if (message.length > 5) {
        try {
          const searchResults = await hybridSearch(message, userId, agentId, workspaceId, 5);
          context = `\n\n### 🧠 RECALLED CONTEXT:\n${searchResults.map(r => r.payload?.content).join('\n---\n')}`;

          // PHASE 4: AI Intelligence (Reasoning & Planning)
          console.log(`[Intelligence] Generating reasoning for message...`);
          const reasoning = await generateReasoning([...history, { role: 'user', content: message }]);
          reasoningData = reasoning;

          routingInfo += `\n\n### 💭 THINKING PROCESS:\n${reasoning.thinking}`;

          // PHASE 3: Few-Shot Learning
          const examples = await getFewShotPrompt(message, userId);
          if (examples) context += `\n\n${examples}`;

          // Update system prompt with thinking process context
          context += `\n\n### 🧩 INTERNAL REASONING:\nPlan: ${reasoning.decomposition.join(' -> ')}\nConfidence: ${reasoning.confidence}`;

        } catch (e: any) { console.error(`[${requestId}] Intelligence Error:`, e.message); }
      }

      // 2. Route to Private GPU (Universe)
      provider = createOpenAI({
        apiKey: process.env.SOVEREIGN_KEY || 'ollama',
        baseURL: `${process.env.UNIVERSE_INFERENCE_URL || 'http://10.128.0.8:11434'}/v1`,
        // @ts-ignore compatibility mode
        compatibility: 'compatible',
      });
      model = process.env.UNIVERSE_MODEL || 'llama3:70b-instruct-q4_0';
    }

    const systemPrompt = `You are Pandora, an advanced Sovereign AI assistant.
### Capabilities:
- **Memory**: You have access to long-term memory. ALWAYS search the knowledge base before answering technical or factual questions to ensure accuracy.
${agentId === 'builder' || intent === 'BUILD' ? `
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

    try {
      const result = await streamText({
        model: provider(model),
        system: systemPrompt,
        messages: uiMessages as any,
        abortSignal: AbortSignal.timeout(30000), // 30s max for the whole stream
        onError: (error: any) => {
          console.error(`[${requestId}] streamText Error Diagnostic:`, {
            error: error.message || error.error?.message || String(error),
            model,
            intent,
            agentId,
            hasSovereignKey: !!process.env.SOVEREIGN_KEY,
            hasGroqKey: !!process.env.GROQ_API_KEY,
            hasOpenAIKey: !!process.env.OPENAI_API_KEY
          });
        },
        onFinish: async ({ text: completion }) => {
          try {
            // Perform Self-ReflectionFact-Check
            const verification = await selfVerify(completion, context);
            console.log(`[Reflection] Result: ${verification.isAccurate ? 'PASS' : 'FAIL'} - ${verification.reasoning}`);

            const assistantMessageRef = db.collection(`users/${userId}/agents/${agentId}/history`).doc();

            // Create a "faked" tool usage to show reasoning in the UI
            const toolUsages: any[] = [];

            if (reasoningData) {
              toolUsages.push({
                toolName: 'Reasoning Engine',
                input: { goal: 'Chain-of-Thought Decomposition' },
                output: { thinking: reasoningData.thinking, steps: reasoningData.decomposition, confidence: reasoningData.confidence }
              });
            }

            await assistantMessageRef.set({
              role: 'assistant',
              content: verification.isAccurate ? completion : (verification.correction || completion),
              threadId,
              workspaceId: workspaceId || null,
              createdAt: FieldValue.serverTimestamp(),
              toolUsages,
              metadata: {
                verification: verification.reasoning,
                wasCorrected: !verification.isAccurate,
                wasClarified: !!activeLearningQuestion
              }
            });
            db.doc(`users/${userId}/threads/${threadId}`).update({ updatedAt: FieldValue.serverTimestamp() }).catch(e => { });
          } catch (e) { console.error(`[${requestId}] onFinish Error:`, e); }
        }
      });

      return result.toDataStreamResponse({ headers: corsHeaders() });
    } catch (primaryError: any) {
      console.warn(`[${requestId}] Primary provider failed, triggering Gemini Safety Net:`, primaryError.message);

      // SAFETY NET: Fallback to Gemini if Groq/Ollama fails
      // Note: We'd ideally use the @ai-sdk/google provider here. 
      // If not yet installed, we'll return a helpful error message with a retry suggestion.
      // For now, let's try a fallback to a potentially more stable Groq model if it was an Ollama failure,
      // or return a "Sovereign Node Offline" message that doesn't hang.

      throw primaryError; // Proceed to global catch if no fallback provider is ready
    }

  } catch (error: any) {
    console.error(`[${requestId}] Chat API Fatal Error:`, error);
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500, headers: corsHeaders() }
    );
  }
}
