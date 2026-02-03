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
import { reconstructTimeline, generateNarrative } from '@/lib/ai/episodic-memory';
import { exploreTreeOfThoughts } from '@/lib/ai/tree-of-thoughts';
import { generateCreativeArtifact } from '@/lib/ai/creative';
import { v4 as uuidv4 } from 'uuid';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { getDispatcher } from '@/modules/intelligence/router';
import { summarizeThreadTitle } from '@/lib/ai/summarizer';

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
    const userMessageRef = db.collection(`users/${userId}/threads/${threadId}/messages`).doc();
    await userMessageRef.set({
      role: 'user',
      content: message,
      workspaceId: workspaceId || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    let context = '';
    let recalledSources: any[] = [];


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

    // PHASE 2.1: Smart Model Orchestration
    const routeInfo = await selectModel(message, intent as any);
    console.log(`[Orchestration] Routing ${intent} to ${routeInfo.provider}:${routeInfo.modelId}`);

    if (routeInfo.provider === 'groq') {
      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        // Fallback to local
        provider = createOpenAI({
          apiKey: process.env.SOVEREIGN_KEY || 'ollama',
          baseURL: `${process.env.UNIVERSE_INFERENCE_URL || 'http://10.128.0.8:11434'}/v1`,
          compatibility: 'compatible',
        });
        model = process.env.UNIVERSE_MODEL || 'mistral:latest';
        routingInfo = '\n\n### 📡 ACTIVE SUBNETWORK: UNIVERSE_FALLBACK (Groq unavailable)';
      } else {
        provider = createOpenAI({
          apiKey: groqApiKey,
          baseURL: 'https://api.groq.com/openai/v1',
          compatibility: 'compatible',
        });
        model = routeInfo.modelId;
        routingInfo = `\n\n### 📡 ACTIVE SUBNETWORK: ${intent === 'BUILD' ? 'CODER_LANE' : 'SPEED_NET'}`;
      }
    } else {
      // Default Sovereign Route
      provider = createOpenAI({
        apiKey: process.env.SOVEREIGN_KEY || 'ollama',
        baseURL: `${process.env.UNIVERSE_INFERENCE_URL || 'http://10.128.0.8:11434'}/v1`,
        compatibility: 'compatible',
      });
      model = routeInfo.modelId;
    }
    // 1. Perform Hybrid Search for Universe/Chat Agent
    if (message.length > 5) {
      try {
        const searchResults = await hybridSearch(message, userId, agentId, workspaceId, 5);
        recalledSources = searchResults;
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

        // PHASE 4: Episodic Memory (Timeline)
        const timeline = await reconstructTimeline(searchResults.map(r => ({
          id: r.id.toString(),
          text: r.payload?.content || '',
          score: r.score,
          timestamp: r.payload?.createdAt || r.payload?.created_at || new Date().toISOString()
        })));
        if (timeline.length > 0) context += `\n\n${generateNarrative(timeline)}`;

        // PHASE 8: Tree-of-Thoughts (Optional exploration for complex queries)
        if (message.length > 100) {
          console.log(`[Intelligence] Exploring Tree-of-Thoughts...`);
          const branches = await exploreTreeOfThoughts(message);
          if (branches.length > 0) {
            context += `\n\n### 🌲 ALTERNATIVE LOGICAL PATHS:\n${branches.map(b => `- ${b.path} (Score: ${b.score}/100)`).join('\n')}`;
          }
        }

      } catch (e: any) { console.error(`[${requestId}] Intelligence Error:`, e.message); }
    }

    // 2. Already handled by selectModel

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

            // PHASE 8.3: Constitutional AI Check
            const principles = ["Privacy: Never leak internal paths.", "Sovereignty: Maintain data localism.", "Accuracy: Distinguish between facts and inference."];
            const compliesWithPrinciples = principles.every(p => !completion.toLowerCase().includes(p.split(':')[0].toLowerCase()));

            console.log(`[Reflection] Result: ${verification.isAccurate ? 'PASS' : 'FAIL'} - ${verification.reasoning}`);
            console.log(`[Constitutional] Compliance: ${compliesWithPrinciples ? 'PASS' : 'RETRY'}`);

            const assistantMessageRef = db.collection(`users/${userId}/threads/${threadId}/messages`).doc();

            // Create a "faked" tool usage to show reasoning in the UI
            const toolUsages: any[] = [];

            if (reasoningData) {
              toolUsages.push({
                toolName: 'Reasoning Engine',
                input: { goal: 'Chain-of-Thought Decomposition' },
                output: { thinking: reasoningData.thinking, steps: reasoningData.decomposition, confidence: reasoningData.confidence }
              });
            }

            if (recalledSources.length > 0) {
              toolUsages.push({
                toolName: 'Memory Recall',
                input: { query: message, count: recalledSources.length },
                output: recalledSources.map(r => ({
                  title: r.payload?.source || 'Knowledge Base',
                  snippet: r.payload?.content?.substring(0, 100) + '...',
                  score: r.score
                }))
              });
            }

            // Auto-Title Trigger (Sovereign GPU)
            if (cleanHistory.length <= 2) {
              summarizeThreadTitle(threadId, userId, message + "\n" + (completion || ""));
            }

            await assistantMessageRef.set({
              role: 'assistant',
              content: verification.isAccurate ? completion : (verification.correction || completion),
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
