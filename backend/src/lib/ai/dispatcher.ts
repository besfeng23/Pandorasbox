/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THREE-BRAIN DISPATCHER SERVICE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Logic:
 * - If user query is technical (coding, architecture, data analysis) -> BUILDER (Gemini)
 * - If user query is social (roleplay, philosophy, general chat) -> UNIVERSE (Local)
 */

import Groq from 'groq-sdk';

export type BrainTarget = 'UNIVERSE' | 'BUILDER';

export interface ClassificationResult {
    target: BrainTarget;
    reason: string;
}

export class DispatcherService {
    private groqClient: Groq;
    private readonly reflexModel: string;

    constructor() {
        this.groqClient = new Groq({
            apiKey: process.env.GROQ_API_KEY || '',
        });
        this.reflexModel = process.env.REFLEX_MODEL || 'llama-3.3-70b-versatile';
    }

    /**
     * Classify user intent using the Groq Reflex Engine for sub-second routing
     */
    async classifyIntent(userQuery: string): Promise<ClassificationResult> {
        if (!process.env.GROQ_API_KEY) {
            console.warn('[Dispatcher] GROQ_API_KEY missing, defaulting to UNIVERSE');
            return { target: 'UNIVERSE', reason: 'GROQ_API_KEY not configured' };
        }

        try {
            const response = await this.groqClient.chat.completions.create({
                model: this.reflexModel,
                messages: [
                    {
                        role: 'system',
                        content: `You are the Reflex Engine for a Three-Brain AI system.
Classify the user's intent into one of two targets:
1. BUILDER: For complex reasoning, coding, architecture, deep technical analysis, or complex formatting.
2. UNIVERSE: For roleplay, philosophy, creative writing, general chat, or emotional support.

Respond ONLY with valid JSON in this format:
{ "target": "BUILDER" | "UNIVERSE", "reason": "brief explanation" }`
                    },
                    { role: 'user', content: userQuery }
                ],
                temperature: 0.1,
                response_format: { type: 'json_object' }
            });

            const content = response.choices[0]?.message?.content;
            if (!content) throw new Error('Empty response from Groq');

            return JSON.parse(content) as ClassificationResult;
        } catch (error: any) {
            console.error('[Dispatcher] Classification failed:', error.message);
            return {
                target: 'UNIVERSE',
                reason: 'Error during classification, defaulted to UNIVERSE'
            };
        }
    }
}

// Singleton instance
let instance: DispatcherService | null = null;

export function getDispatcher(): DispatcherService {
    if (!instance) {
        instance = new DispatcherService();
    }
    return instance;
}
