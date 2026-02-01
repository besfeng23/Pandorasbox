/**
 * ═══════════════════════════════════════════════════════════════════════════
 * SEMANTIC ROUTER (DISPATCHER)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { GroqProvider, OllamaProvider, LLMProvider, LLMMessage } from './llm-provider';

export type Intent = 'BUILD' | 'CHAT' | 'VOICE';

export interface DispatcherConfig {
    universeUrl: string;
    groqKey: string;
}

export class Dispatcher {
    private universe: LLMProvider;
    private builder: LLMProvider;
    private reflex: LLMProvider;

    constructor(config: DispatcherConfig) {
        this.universe = new OllamaProvider(config.universeUrl);
        this.builder = new GroqProvider(config.groqKey);
        this.reflex = new GroqProvider(config.groqKey); // Using Groq for reflex layer too
    }

    /**
     * Classify user intent for routing
     */
    async classifyIntent(prompt: string): Promise<Intent> {
        const systemPrompt = `Analyze the user's prompt and classify it into one of three intents:
1. BUILD: If the user wants to generate code, refactor, build a feature, or create an artifact.
2. CHAT: If the user wants to talk, roleplay, ask about memories, or engage in philosophy.
3. VOICE: If the prompt looks like an audio transcription artifact or voice command.

Respond with ONLY the word: BUILD, CHAT, or VOICE.`;

        const response = await this.reflex.generateResponse(
            [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: prompt }
            ],
            process.env.REFLEX_MODEL || 'llama-3.1-8b-instant'
        );

        const intent = response.content.trim().toUpperCase();
        if (intent.includes('BUILD')) return 'BUILD';
        if (intent.includes('VOICE')) return 'VOICE';
        return 'CHAT';
    }

    /**
     * Main dispatch method
     */
    async dispatch(prompt: string, messages: LLMMessage[]) {
        const intent = await this.classifyIntent(prompt);

        console.log(`[Dispatcher] Routing intent: ${intent}`);

        if (intent === 'BUILD') {
            return this.builder.generateResponse(messages, process.env.BUILDER_MODEL);
        }

        // Default to Universe for Chat/Remember
        try {
            // Check health of private GPU first
            const islandHealthy = await this.universe.checkHealth();
            if (!islandHealthy) {
                throw new Error('Universe Agent (Private GPU) is offline or cold.');
            }
            return this.universe.generateResponse(messages, process.env.UNIVERSE_MODEL);
        } catch (error: any) {
            console.warn(`[Dispatcher] Universe fallback triggered: ${error.message}`);
            return {
                content: `⚠️ **System Connectivity Alert:** The Universe Agent (Private GPU) is currently offline or unreachable via VPC. 
        
I am unable to access your long-term memories or sovereign processing at this moment. Please check the GCP instance status at 10.128.0.4.`
            };
        }
    }
}

// Singleton export
let dispatcher: Dispatcher | null = null;

export function getDispatcher() {
    if (!dispatcher) {
        dispatcher = new Dispatcher({
            universeUrl: process.env.UNIVERSE_INFERENCE_URL || 'http://10.128.0.4:11434',
            groqKey: process.env.GROQ_API_KEY || ''
        });
    }
    return dispatcher;
}
