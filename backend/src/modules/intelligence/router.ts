/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEMANTIC ROUTER (DISPATCHER)
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Split-Brain Architecture:
 *   - REFLEX: Fast intent classification (Groq preferred, Ollama fallback)
 *   - BUILDER: Code generation (Groq)
 *   - UNIVERSE: Chat/Memory (Private Ollama)
 */

import { GroqProvider, OllamaProvider, LLMProvider, LLMMessage } from './llm-provider';

export type Intent = 'BUILD' | 'CHAT' | 'VOICE';

export interface DispatcherConfig {
    universeUrl: string;
    groqKey: string;
}

export class Dispatcher {
    private universe: LLMProvider;
    private builder: LLMProvider | null;
    private reflex: LLMProvider;
    private hasGroq: boolean;

    constructor(config: DispatcherConfig) {
        this.universe = new OllamaProvider(config.universeUrl);
        this.hasGroq = !!config.groqKey && config.groqKey.length > 10;

        if (this.hasGroq) {
            this.builder = new GroqProvider(config.groqKey);
            this.reflex = new GroqProvider(config.groqKey);
            console.log('[Dispatcher] Initialized with Groq for Builder/Reflex');
        } else {
            // Fallback: Use Ollama for everything when Groq is unavailable
            this.builder = null; // Will fallback to Universe
            this.reflex = new OllamaProvider(config.universeUrl);
            console.warn('[Dispatcher] GROQ_API_KEY not set - using Ollama for all agents');
        }
    }

    /**
     * Classify user intent for routing
     * Uses fast Groq model if available, falls back to local Ollama
     */
    async classifyIntent(prompt: string): Promise<Intent> {
        const systemPrompt = `Analyze the user's prompt and classify it into one of three intents:
1. BUILD: If the user wants to generate code, refactor, build a feature, or create an artifact.
2. CHAT: If the user wants to talk, roleplay, ask about memories, or engage in philosophy.
3. VOICE: If the prompt looks like an audio transcription artifact or voice command.

Respond with ONLY the word: BUILD, CHAT, or VOICE.`;

        try {
            const model = this.hasGroq
                ? (process.env.REFLEX_MODEL || 'llama-3.1-8b-instant')
                : (process.env.UNIVERSE_MODEL || 'mistral');

            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 5000);

            const response = await this.reflex.generateResponse(
                [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: prompt }
                ],
                model
            );
            clearTimeout(timeoutId);

            const intent = response.content.trim().toUpperCase();
            if (intent.includes('BUILD')) return 'BUILD';
            if (intent.includes('VOICE')) return 'VOICE';
            return 'CHAT';
        } catch (error: any) {
            console.error('[Dispatcher] Intent classification failed:', error.message);
            // Default to CHAT on error to ensure graceful degradation
            return 'CHAT';
        }
    }

    /**
     * Check if Groq (Builder Agent) is available
     */
    isBuilderAvailable(): boolean {
        return this.hasGroq && this.builder !== null;
    }

    /**
     * Main dispatch method
     */
    async dispatch(prompt: string, messages: LLMMessage[]) {
        const intent = await this.classifyIntent(prompt);

        console.log(`[Dispatcher] Routing intent: ${intent}`);

        if (intent === 'BUILD' && this.builder) {
            return this.builder.generateResponse(messages, process.env.BUILDER_MODEL);
        }

        // Default to Universe for Chat/Remember (or BUILD fallback)
        try {
            const islandHealthy = await this.universe.checkHealth();
            if (!islandHealthy) {
                throw new Error('Universe Agent (Private GPU) is offline or cold.');
            }
            return this.universe.generateResponse(messages, process.env.UNIVERSE_MODEL);
        } catch (error: any) {
            console.warn(`[Dispatcher] Universe fallback triggered: ${error.message}`);
            return {
                content: `⚠️ **System Connectivity Alert:** The Universe Agent (Private GPU) is currently offline or unreachable via VPC. 
        
I am unable to access your long-term memories or sovereign processing at this moment. Please check the GCP instance status at 10.128.0.8.`
            };
        }
    }
}

// Singleton export
let dispatcher: Dispatcher | null = null;

export function getDispatcher() {
    if (!dispatcher) {
        const groqKey = process.env.GROQ_API_KEY || '';
        dispatcher = new Dispatcher({
            universeUrl: process.env.UNIVERSE_INFERENCE_URL || 'http://10.128.0.8:11434',
            groqKey: groqKey
        });
    }
    return dispatcher;
}
