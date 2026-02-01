/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HYBRID DISPATCHER SERVICE
 * The "Two-Brain System" Router - Routes queries to Local or Cloud Brain
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Purpose: Intelligent routing between:
 *   - LOCAL BRAIN (Universe Agent): Deep thinking, roleplay, personality, memory
 *   - CLOUD BRAIN (Builder Agent): Coding, fast utility, summarizing, tools
 * 
 * Uses Groq's Llama 3.1 8B for blazing-fast classification with JSON mode
 */

import { z } from 'zod';
import Groq from 'groq-sdk';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS & SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Target Agent Enum - Where to route the query
 */
export enum TargetAgent {
  LOCAL = 'LOCAL',   // Universe Agent - Local LLM (Ollama/vLLM)
  GROQ = 'GROQ'      // Builder Agent - Groq Cloud
}

/**
 * Intent Categories for Classification
 */
export enum IntentCategory {
  // Cloud Brain (GROQ) intents
  CODE = 'CODE',
  REFACTOR = 'REFACTOR',
  SUMMARIZE = 'SUMMARIZE',
  SEARCH_WEB = 'SEARCH_WEB',
  ANALYZE_DATA = 'ANALYZE_DATA',
  TOOL_USE = 'TOOL_USE',
  
  // Local Brain (LOCAL) intents
  CHAT = 'CHAT',
  PERSONAL = 'PERSONAL',
  PHILOSOPHY = 'PHILOSOPHY',
  MEMORY_RECALL = 'MEMORY_RECALL',
  CREATIVE = 'CREATIVE',
  ROLEPLAY = 'ROLEPLAY'
}

/**
 * Zod Schema for Classification Response
 * Enforces structured output from Groq
 */
export const ClassificationSchema = z.object({
  intent: z.nativeEnum(IntentCategory),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().max(200),
  keywords: z.array(z.string()).max(5),
  requiresMemory: z.boolean(),
  suggestedAgent: z.nativeEnum(TargetAgent)
});

export type ClassificationResult = z.infer<typeof ClassificationSchema>;

/**
 * Dispatch Result with full context
 */
export interface DispatchResult {
  targetAgent: TargetAgent;
  classification: ClassificationResult;
  metadata: {
    processingTimeMs: number;
    model: string;
    fallbackUsed: boolean;
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// DISPATCHER SERVICE CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class DispatcherService {
  private groqClient: Groq | null = null;
  private readonly classificationModel = 'llama-3.1-8b-instant';
  
  constructor() {
    this.initializeGroqClient();
  }
  
  /**
   * Initialize Groq client lazily
   */
  private initializeGroqClient(): void {
    const apiKey = process.env.GROQ_API_KEY;
    if (apiKey) {
      this.groqClient = new Groq({ apiKey });
      console.log('[Dispatcher] Groq client initialized for classification');
    } else {
      console.warn('[Dispatcher] GROQ_API_KEY not set, using fallback routing');
    }
  }
  
  /**
   * Main dispatch method - Routes user message to appropriate agent
   */
  async dispatch(
    userMessage: string,
    audioTranscript?: string,
    context?: { hasMemoryHits?: boolean; previousIntent?: IntentCategory }
  ): Promise<DispatchResult> {
    const startTime = Date.now();
    
    // Combine message and transcript
    const fullInput = audioTranscript 
      ? `${userMessage}\n[Audio Transcript]: ${audioTranscript}`
      : userMessage;
    
    // Try Groq classification first
    if (this.groqClient) {
      try {
        const classification = await this.classifyWithGroq(fullInput, context);
        return {
          targetAgent: classification.suggestedAgent,
          classification,
          metadata: {
            processingTimeMs: Date.now() - startTime,
            model: this.classificationModel,
            fallbackUsed: false
          }
        };
      } catch (error) {
        console.error('[Dispatcher] Groq classification failed, using fallback:', error);
      }
    }
    
    // Fallback to regex-based routing
    const fallbackResult = this.fallbackClassify(fullInput);
    return {
      targetAgent: fallbackResult.suggestedAgent,
      classification: fallbackResult,
      metadata: {
        processingTimeMs: Date.now() - startTime,
        model: 'regex-fallback',
        fallbackUsed: true
      }
    };
  }
  
  /**
   * Classify intent using Groq's fast LLM with JSON mode
   */
  private async classifyWithGroq(
    input: string,
    context?: { hasMemoryHits?: boolean; previousIntent?: IntentCategory }
  ): Promise<ClassificationResult> {
    if (!this.groqClient) {
      throw new Error('Groq client not initialized');
    }
    
    const systemPrompt = `You are an intent classifier for a hybrid AI system.
Analyze the user's message and classify their intent.

ROUTING RULES:
- CODE, REFACTOR, SUMMARIZE, SEARCH_WEB, ANALYZE_DATA, TOOL_USE → Route to GROQ (Cloud Brain)
- CHAT, PERSONAL, PHILOSOPHY, MEMORY_RECALL, CREATIVE, ROLEPLAY → Route to LOCAL (Local Brain)

IMPORTANT:
- Technical/coding questions ALWAYS go to GROQ
- Personal, emotional, creative, or philosophical topics go to LOCAL
- If the user asks about past conversations or memories, set requiresMemory=true
- Be concise in reasoning (max 200 chars)

Respond ONLY with valid JSON matching this schema:
{
  "intent": "CODE|REFACTOR|SUMMARIZE|SEARCH_WEB|ANALYZE_DATA|TOOL_USE|CHAT|PERSONAL|PHILOSOPHY|MEMORY_RECALL|CREATIVE|ROLEPLAY",
  "confidence": 0.0-1.0,
  "reasoning": "Brief explanation",
  "keywords": ["key", "words"],
  "requiresMemory": true|false,
  "suggestedAgent": "LOCAL|GROQ"
}`;

    const userPrompt = context?.previousIntent 
      ? `Previous intent: ${context.previousIntent}\nCurrent message: ${input}`
      : input;
    
    const response = await this.groqClient.chat.completions.create({
      model: this.classificationModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('Empty response from Groq');
    }
    
    // Parse and validate with Zod
    const parsed = JSON.parse(content);
    return ClassificationSchema.parse(parsed);
  }
  
  /**
   * Fallback classification using regex patterns
   */
  private fallbackClassify(input: string): ClassificationResult {
    const lowerInput = input.toLowerCase();
    
    // GROQ-bound patterns (technical)
    const codePatterns = /(code|function|class|typescript|javascript|python|react|component|api|bug|error|debug|refactor|implement)/i;
    const summarizePatterns = /(summarize|summary|tldr|condense|overview|brief)/i;
    const searchPatterns = /(search|find|look up|google|web|news|current events)/i;
    const analyzePatterns = /(analyze|compare|evaluate|pros and cons|data|statistics|metrics)/i;
    
    // LOCAL-bound patterns (personal/creative)
    const personalPatterns = /(feel|emotion|personal|my life|advice|help me|worried|stressed|happy|sad)/i;
    const philosophyPatterns = /(meaning|existence|consciousness|ethics|morality|philosophy|why do|what is life)/i;
    const creativePatterns = /(write|story|poem|creative|imagine|dream|fantasy|roleplay|pretend)/i;
    const memoryPatterns = /(remember|recall|last time|previously|we discussed|you told me|my history)/i;
    
    // Match patterns
    if (codePatterns.test(lowerInput)) {
      return this.createFallbackResult(IntentCategory.CODE, TargetAgent.GROQ, 0.85);
    }
    if (summarizePatterns.test(lowerInput)) {
      return this.createFallbackResult(IntentCategory.SUMMARIZE, TargetAgent.GROQ, 0.8);
    }
    if (searchPatterns.test(lowerInput)) {
      return this.createFallbackResult(IntentCategory.SEARCH_WEB, TargetAgent.GROQ, 0.8);
    }
    if (analyzePatterns.test(lowerInput)) {
      return this.createFallbackResult(IntentCategory.ANALYZE_DATA, TargetAgent.GROQ, 0.75);
    }
    if (personalPatterns.test(lowerInput)) {
      return this.createFallbackResult(IntentCategory.PERSONAL, TargetAgent.LOCAL, 0.8);
    }
    if (philosophyPatterns.test(lowerInput)) {
      return this.createFallbackResult(IntentCategory.PHILOSOPHY, TargetAgent.LOCAL, 0.85);
    }
    if (creativePatterns.test(lowerInput)) {
      return this.createFallbackResult(IntentCategory.CREATIVE, TargetAgent.LOCAL, 0.8);
    }
    if (memoryPatterns.test(lowerInput)) {
      return this.createFallbackResult(IntentCategory.MEMORY_RECALL, TargetAgent.LOCAL, 0.9, true);
    }
    
    // Default to LOCAL for general chat
    return this.createFallbackResult(IntentCategory.CHAT, TargetAgent.LOCAL, 0.5);
  }
  
  private createFallbackResult(
    intent: IntentCategory,
    agent: TargetAgent,
    confidence: number,
    requiresMemory = false
  ): ClassificationResult {
    return {
      intent,
      confidence,
      reasoning: `Regex pattern match for ${intent}`,
      keywords: [],
      requiresMemory,
      suggestedAgent: agent
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

let dispatcherInstance: DispatcherService | null = null;

export function getDispatcher(): DispatcherService {
  if (!dispatcherInstance) {
    dispatcherInstance = new DispatcherService();
  }
  return dispatcherInstance;
}

export default DispatcherService;
