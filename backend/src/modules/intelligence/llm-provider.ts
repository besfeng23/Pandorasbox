/**
 * ═══════════════════════════════════════════════════════════════════════════
 * LLM PROVIDER ABSTRACTION
 * ═══════════════════════════════════════════════════════════════════════════
 */

import Groq from 'groq-sdk';

export interface LLMMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface LLMResponse {
    content: string;
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface LLMProvider {
    generateResponse(messages: LLMMessage[], model?: string): Promise<LLMResponse>;
    checkHealth(): Promise<boolean>;
}

/**
 * Groq Provider (Builder Agent)
 */
export class GroqProvider implements LLMProvider {
    private client: Groq;

    constructor(apiKey: string) {
        this.client = new Groq({ apiKey });
    }

    async generateResponse(messages: LLMMessage[], model: string = 'llama-3.3-70b-versatile'): Promise<LLMResponse> {
        const response = await this.client.chat.completions.create({
            messages,
            model,
            temperature: 0.7,
        });

        return {
            content: response.choices[0]?.message?.content || '',
            usage: {
                promptTokens: response.usage?.prompt_tokens || 0,
                completionTokens: response.usage?.completion_tokens || 0,
                totalTokens: response.usage?.total_tokens || 0,
            }
        };
    }

    async checkHealth(): Promise<boolean> {
        try {
            // Small test call
            await this.client.models.list();
            return true;
        } catch {
            return false;
        }
    }
}

/**
 * Ollama Provider (Universe Agent - Private GPU)
 */
export class OllamaProvider implements LLMProvider {
    constructor(private baseUrl: string) { }

    async generateResponse(messages: LLMMessage[], model: string = 'llama3:70b-instruct-q4_0'): Promise<LLMResponse> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(`${this.baseUrl}/api/chat`, {
            method: 'POST',
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.SOVEREIGN_KEY || 'ollama'}`
            },
            body: JSON.stringify({
                model,
                messages,
                stream: false,
            }),
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            throw new Error(`Ollama error: ${response.statusText}`);
        }

        const data = await response.json();
        return {
            content: data.message?.content || '',
            usage: {
                promptTokens: data.prompt_eval_count || 0,
                completionTokens: data.eval_count || 0,
                totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
            }
        };
    }

    async checkHealth(): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/api/tags`, {
                signal: AbortSignal.timeout(5000)
            });
            return response.ok;
        } catch {
            return false;
        }
    }
}
