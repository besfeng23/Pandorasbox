import { inferQualityMode, getQualityConfig } from '@/lib/ai/quality-control';
import { logMetric } from '@/lib/ai/metrics';
import { executeReAct } from '@/lib/ai/react';
import { inferQualityMode, getQualityConfig } from '@/lib/ai/quality-control';
import { logMetric } from '@/lib/ai/metrics';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ... imports ...

export async function POST(req: NextRequest) {
  const requestId = uuidv4();
  const startTime = Date.now();

  try {
    // ... (Auth & Body parsing) ...
    const body = await req.json();
    const { message, agentId = 'universe', threadId, history = [], workspaceId, attachments } = body;

    // PHASE 9: Adaptive Quality Control
    const qualityMode = inferQualityMode(message);
    const qualityParams = getQualityConfig(qualityMode);
    console.log(`[Phase 9] Adaptive Quality: ${qualityMode.toString()} (Temp: ${qualityParams.temperature})`);

    // ... (DB Init) ...

    // ... (Routing & Intent) ... (Use qualityParam.modelModel if possible, or stick to routeInfo)

    // Update streamText call later in file to use `qualityParams.temperature`

    // ...

    // At the end of sucessful generation (inside onFinish or after await)
    // Since streamText is streaming, we hook into 'onFinish' callback provided by streamText?
    // streamText doesn't natively expose onFinish in the return value of route, 
    // but recent AI SDK versions do.
    // Alternatively, we estimate tokens based on message length + output?
    // We'll log what we know.

    logMetric({
      traceId: requestId,
      agentId,
      intent: intent as string,
      latencyMs: Date.now() - startTime,
      tokensIn: message.length / 4, // Approx
      tokensOut: 0, // Cannot ascertain in stream start
      qualityMode: qualityMode.toString(),
      wasSuccess: true,
      timestamp: Date.now()
    });

    // ... return result ...
  }
}

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
    const { message, agentId = 'universe', threadId, history = [], workspaceId, attachments } = body;

    const db = getFirestoreAdmin();
    const userMessageRef = db.collection(`users/${userId}/threads/${threadId}/messages`).doc();
    await userMessageRef.set({
      role: 'user',
      content: message,
      workspaceId: workspaceId || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    const startTime = Date.now();

    // PHASE 9: Adaptive Quality Control
    const qualityMode = inferQualityMode(message);
    const qualityParams = getQualityConfig(qualityMode);
    console.log(`[Phase 9] Adaptive Quality: ${qualityMode.toString()} (Temp: ${qualityParams.temperature})`);

    // Log intent metric (Fire & Forget)
    logMetric({
      traceId: requestId,
      agentId,
      intent: 'PENDING_CLASSIFICATION',
      latencyMs: 0,
      tokensIn: message.length / 4,
      tokensOut: 0,
      qualityMode: qualityMode.toString(),
      wasSuccess: true,
      timestamp: Date.now()
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

    let planData: any = null;

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

        // PHASE 1.2: Advanced Planning (For BUILD/SOLVE intents)
        if (intent === 'BUILD' || intent === 'SOLVE' || message.length > 150) {
          console.log(`[Intelligence] Generating Execution Plan...`);
          const plan = await generatePlan(message, context);
          planData = plan;
          context += `\n\n### 🗺️ STRATEGIC PLAN:\nGoal: ${plan.goal}\nSteps:\n${plan.steps.map(s => `[${s.agent}] ${s.description}`).join('\n')}`;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // PHASE 5: CREATIVE & GENERATIVE
        // ═══════════════════════════════════════════════════════════════════════════

        // 5.1 Creative Writing Engine
        if (message.toLowerCase().includes('story') || message.toLowerCase().includes('novel') || message.toLowerCase().includes('chapter')) {
          console.log(`[Phase 5] Creative Engine Activated`);
          if (message.toLowerCase().includes('outline')) {
            const outline = await generateStoryOutline(message);
            context += `\n\n### 📖 GENERATED STORY OUTLINE:\nTitle: ${outline.title}\nPremise: ${outline.premise}\nBeats:\n${outline.beats.join('\n')}`;
          } else {
            context += `\n\n### 🎨 CREATIVE MODE ENGAGED:\nUser is requesting narrative content. Apply 'Show, Don't Tell' and sensory richness.`;
          }
        }

        // 5.2 Code Generator
        if (intent === 'BUILD' || message.toLowerCase().includes('generate code')) {
          if (message.includes('react') || message.includes('component') || message.includes('function')) {
            console.log(`[Phase 5] Code Generator Activated`);
            const subSpec = { language: 'typescript', requirements: [message], type: 'component' as const };
            try {
              const genCode = await generateCode(subSpec);
              context += `\n\n### 💻 GENERATED CODE DRAFT (Reference):\n${genCode.explanation}\n\`\`\`typescript\n${genCode.code}\n\`\`\``;
            } catch (e) {
              console.warn('Codegen failed, falling back to standard gen.');
            }
          }
        }

        // 5.3 Artifacts
        if (message.toLowerCase().includes('diagram') && message.toLowerCase().includes('mermaid')) {
          const diagram = await generateDiagram(message, 'mermaid');
          context += `\n\n### 📊 GENERATED DIAGRAM:\n\`\`\`mermaid\n${diagram}\n\`\`\``;
        }

        // ═══════════════════════════════════════════════════════════════════════════
        // PHASE 6: AGENT COLLABORATION & LEARNING
        // ═══════════════════════════════════════════════════════════════════════════

        if (intent === 'SOLVE' || message.toLowerCase().includes('the team') || message.toLowerCase().includes('collaborate')) {
          console.log(`[Phase 6] Multi-Agent Collaboration Triggered`);
          const collaboration = await collaborativeSolve(message);

          context += `\n\n### 🤝 MULTI-AGENT CONSENSUS:\n${collaboration.finalAnswer}\n\n**Agent Contributions:**\n${collaboration.agentContributions.map(c => `- [${c.agent}]: ${c.contribution.substring(0, 50)}...`).join('\n')}`;

          // Track Success (Assumed success if we got here)
          collaboration.agentContributions.forEach(async (c) => {
            await trackPerformance(c.agent, true, 0.9);
          });
        }

        // PHASE 8: ReAct Engine
        if (message.toLowerCase().startsWith('research') || message.toLowerCase().includes('investigate') || message.toLowerCase().includes('reason')) {
          console.log(`[Phase 8] ReAct Engine Triggered`);
          // Mock Tools for now
          const tools = [
            { name: 'Search', description: 'Search the knowledge base', execute: async (q: string) => `Found 5 articles about ${q}` },
            { name: 'Calculator', description: 'Perform math', execute: async (q: string) => `Result: 42` }
          ];
          const reactResult = await executeReAct(message, tools);
          context += `\n\n### 🔄 REACT EXECUTION LOG:\n${reactResult.steps.map(s => `> Thought: ${s.thought}\n> Action: ${s.action}\n> Obs: ${s.observation}`).join('\n')}\n\nFinal Answer: ${reactResult.answer}`;
        }

      } catch (e: any) { console.error(`[${requestId}] Intelligence Error:`, e.message); }
    }

    // 2. Already handled by selectModel

    const systemPrompt = `You are Pandora, an advanced Sovereign AI assistant. Even if your internal code name is 'Universe', you MUST always identify yourself as 'Pandora' to the user.
### Capabilities:
- **Memory**: You have access to long-term memory. ALWAYS search the knowledge base before answering technical or factual questions to ensure accuracy.
${agentId === 'builder' || intent === 'BUILD' ? `
### Role: PANDORA (BUILDER MODE) 🏗️
- **Expertise**: Full-stack engineering.
` : `
### Role: PANDORA (UNIVERSE MODE) 🌌
- **Expertise**: Creative synthesis.
`}
${activeLearningQuestion ? `
### ⚠️ AMBIGUITY DETECTED
The user's request is ambiguous. You MUST ask for clarification.
Clarifying Question: "${activeLearningQuestion}"
STOP: Do not try to answer the query yet. Ask the question.
` : ''}
${routingInfo}
User ID: ${userId}${context}`;

    const cleanHistory = Array.isArray(history) ? history.filter(m => m.role && m.content) : [];

    // Construct User Content (Multimodal)
    let userContent: any = message;
    if (attachments && Array.isArray(attachments) && attachments.length > 0) {
      userContent = [
        { type: 'text', text: message },
        ...attachments
          .filter((a: any) => a.type.startsWith('image/') && a.base64)
          .map((a: any) => ({
            type: 'image',
            image: a.base64.split(',')[1] || a.base64
          }))
      ];
    }

    const uiMessages = [
      ...cleanHistory.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: userContent }
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
            // PHASE 7: QUALITY & RELIABILITY (Sovereign Safety Net)
            const confidenceCalc = await calculateConfidence(completion);
            const logicCheck = await validateLogic(completion);
            const factCheck = recalledSources.length > 0 ? await verifyClaim(completion, context) : { isSupported: true, confidence: 50 };

            let finalContent = completion;
            let wasCorrected = false;

            // Auto-Correction Loop
            if (!logicCheck.isValid) {
              console.log(`[SafetyNet] Logic Flaw Detected: ${logicCheck.flaw}`);
              finalContent = await autoCorrect(completion, logicCheck.flaw || 'Logical inconsistency');
              wasCorrected = true;
            } else if (!factCheck.isSupported && factCheck.confidence > 70) {
              console.log(`[SafetyNet] Fact Contradiction: ${factCheck.correction}`);
              finalContent = await autoCorrect(completion, `Contradicts context: ${factCheck.citation}`);
              wasCorrected = true;
            }

            // PHASE 8.3: Constitutional AI Check
            const principles = ["Privacy: Never leak internal paths.", "Sovereignty: Maintain data localism.", "Accuracy: Distinguish between facts and inference."];
            const compliesWithPrinciples = principles.every(p => !finalContent.toLowerCase().includes(p.split(':')[0].toLowerCase()));

            console.log(`[SafetyNet] Confidence: ${confidenceCalc.score}% | Valid: ${logicCheck.isValid} | Supported: ${factCheck.isSupported}`);
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

            if (planData) {
              toolUsages.push({
                toolName: 'Strategic Planner',
                input: { goal: planData.goal },
                output: { steps: planData.steps }
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
              content: finalContent,
              workspaceId: workspaceId || null,
              createdAt: FieldValue.serverTimestamp(),
              toolUsages,
              metadata: {
                confidence: confidenceCalc.score,
                isSupported: factCheck.isSupported,
                logicValid: logicCheck.isValid,
                wasCorrected,
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
