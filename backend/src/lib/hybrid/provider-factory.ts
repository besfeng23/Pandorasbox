/**
 * ═══════════════════════════════════════════════════════════════════════════
 * AI PROVIDER FACTORY
 * Unified client manager for the "Two-Brain System"
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Manages two distinct AI clients:
 *   1. LOCAL CLIENT (Universe Agent) - OpenAI SDK pointing to Ollama/vLLM
 *   2. GROQ CLIENT (Builder Agent) - Groq SDK for fast cloud inference
 * 
 * Features:
 *   - Lazy initialization
 *   - Health checking
 *   - Automatic fallback
 *   - Model selection
 */

import OpenAI from 'openai';
import Groq from 'groq-sdk';
import { z } from 'zod';
import { TargetAgent } from './dispatcher';

// ═══════════════════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════════════════

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  jsonMode?: boolean;
}

export interface ProviderHealth {
  name: string;
  status: 'online' | 'offline' | 'degraded';
  latencyMs?: number;
  models?: string[];
  error?: string;
}

// Groq Model Configuration
export const GroqModels = {
  COMPLEX: process.env.GROQ_MODEL_COMPLEX || 'llama-3.3-70b-versatile',
  FAST: process.env.GROQ_MODEL_FAST || 'llama-3.1-8b-instant',
  WHISPER: process.env.GROQ_MODEL_WHISPER || 'whisper-large-v3'
} as const;

// Local Model Configuration
export const LocalModels = {
  DEFAULT: process.env.LOCAL_INFERENCE_MODEL || process.env.INFERENCE_MODEL || 'mistral',
  BACKUP: 'qwen2.5:1.5b-instruct'
} as const;

// ═══════════════════════════════════════════════════════════════════════════
// AI PROVIDER FACTORY CLASS
// ═══════════════════════════════════════════════════════════════════════════

export class AIProviderFactory {
  private localClient: OpenAI | null = null;
  private groqClient: Groq | null = null;
  
  private localHealthy = false;
  private groqHealthy = false;
  
  constructor() {
    // Lazy initialization - clients are created on first use
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // CLIENT INITIALIZATION
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Get or create the Local client (Ollama/vLLM via OpenAI SDK)
   */
  getLocalClient(): OpenAI {
    if (!this.localClient) {
      const baseUrl = this.getLocalBaseUrl();
      console.log('[AIFactory] Initializing Local Client:', { baseUrl });
      
      this.localClient = new OpenAI({
        baseURL: baseUrl,
        apiKey: process.env.SOVEREIGN_KEY || 'empty',
        dangerouslyAllowBrowser: true,
        timeout: 60000, // 60s timeout for local inference
        maxRetries: 2
      });
    }
    return this.localClient;
  }
  
  /**
   * Get or create the Groq client
   */
  getGroqClient(): Groq {
    if (!this.groqClient) {
      const apiKey = process.env.GROQ_API_KEY;
      if (!apiKey) {
        throw new Error('GROQ_API_KEY environment variable is not set');
      }
      
      console.log('[AIFactory] Initializing Groq Client');
      this.groqClient = new Groq({
        apiKey,
        timeout: 30000, // 30s timeout for cloud
        maxRetries: 3
      });
    }
    return this.groqClient;
  }
  
  /**
   * Compute the local inference URL with /v1 suffix
   */
  private getLocalBaseUrl(): string {
    const rawUrl = process.env.LOCAL_INFERENCE_URL 
      || process.env.INFERENCE_URL 
      || 'http://localhost:11434';
    
    if (rawUrl.endsWith('/v1')) return rawUrl;
    if (rawUrl.includes('/') && !rawUrl.match(/:\d+$/)) {
      return rawUrl.endsWith('/') ? rawUrl.slice(0, -1) + '/v1' : rawUrl + '/v1';
    }
    return `${rawUrl}/v1`;
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // UNIFIED COMPLETION INTERFACE
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Generate completion from specified agent
   */
  async complete(
    agent: TargetAgent,
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): Promise<string> {
    const { temperature = 0.7, maxTokens = 2048, jsonMode = false } = options;
    
    if (agent === TargetAgent.GROQ) {
      return this.completeWithGroq(messages, temperature, maxTokens, jsonMode);
    } else {
      return this.completeWithLocal(messages, temperature, maxTokens);
    }
  }
  
  /**
   * Stream completion from specified agent
   */
  async *stream(
    agent: TargetAgent,
    messages: ChatMessage[],
    options: CompletionOptions = {}
  ): AsyncGenerator<string, void, unknown> {
    const { temperature = 0.7, maxTokens = 2048 } = options;
    
    if (agent === TargetAgent.GROQ) {
      yield* this.streamWithGroq(messages, temperature, maxTokens);
    } else {
      yield* this.streamWithLocal(messages, temperature, maxTokens);
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // LOCAL CLIENT METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  private async completeWithLocal(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number
  ): Promise<string> {
    const client = this.getLocalClient();
    const model = LocalModels.DEFAULT;
    
    console.log('[AIFactory] Local completion:', { model, messageCount: messages.length });
    
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: false
    });
    
    return response.choices[0]?.message?.content || '';
  }
  
  private async *streamWithLocal(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number
  ): AsyncGenerator<string, void, unknown> {
    const client = this.getLocalClient();
    const model = LocalModels.DEFAULT;
    
    console.log('[AIFactory] Local streaming:', { model, messageCount: messages.length });
    
    const stream = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // GROQ CLIENT METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  private async completeWithGroq(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number,
    jsonMode: boolean
  ): Promise<string> {
    const client = this.getGroqClient();
    const model = GroqModels.COMPLEX;
    
    console.log('[AIFactory] Groq completion:', { model, messageCount: messages.length, jsonMode });
    
    const response = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      response_format: jsonMode ? { type: 'json_object' } : undefined
    });
    
    return response.choices[0]?.message?.content || '';
  }
  
  private async *streamWithGroq(
    messages: ChatMessage[],
    temperature: number,
    maxTokens: number
  ): AsyncGenerator<string, void, unknown> {
    const client = this.getGroqClient();
    const model = GroqModels.COMPLEX;
    
    console.log('[AIFactory] Groq streaming:', { model, messageCount: messages.length });
    
    const stream = await client.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens: maxTokens,
      stream: true
    });
    
    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // HEALTH CHECKS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Check health of Local inference service
   */
  async checkLocalHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      const client = this.getLocalClient();
      const models = await client.models.list();
      
      this.localHealthy = true;
      return {
        name: 'Local (Ollama)',
        status: 'online',
        latencyMs: Date.now() - startTime,
        models: models.data.map(m => m.id)
      };
    } catch (error: any) {
      this.localHealthy = false;
      return {
        name: 'Local (Ollama)',
        status: 'offline',
        latencyMs: Date.now() - startTime,
        error: error.message
      };
    }
  }
  
  /**
   * Check health of Groq service
   */
  async checkGroqHealth(): Promise<ProviderHealth> {
    const startTime = Date.now();
    try {
      const client = this.getGroqClient();
      const models = await client.models.list();
      
      this.groqHealthy = true;
      return {
        name: 'Groq Cloud',
        status: 'online',
        latencyMs: Date.now() - startTime,
        models: models.data.map(m => m.id)
      };
    } catch (error: any) {
      this.groqHealthy = false;
      return {
        name: 'Groq Cloud',
        status: 'offline',
        latencyMs: Date.now() - startTime,
        error: error.message
      };
    }
  }
  
  /**
   * Check health of all providers
   */
  async checkAllHealth(): Promise<{ local: ProviderHealth; groq: ProviderHealth }> {
    const [local, groq] = await Promise.all([
      this.checkLocalHealth(),
      this.checkGroqHealth()
    ]);
    return { local, groq };
  }
  
  // ─────────────────────────────────────────────────────────────────────────
  // UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Get available agent based on health
   */
  async getAvailableAgent(preferred: TargetAgent): Promise<TargetAgent> {
    // Check preferred agent first
    if (preferred === TargetAgent.LOCAL) {
      const health = await this.checkLocalHealth();
      if (health.status === 'online') return TargetAgent.LOCAL;
      
      // Fallback to Groq
      const groqHealth = await this.checkGroqHealth();
      if (groqHealth.status === 'online') {
        console.warn('[AIFactory] Local offline, falling back to Groq');
        return TargetAgent.GROQ;
      }
    } else {
      const health = await this.checkGroqHealth();
      if (health.status === 'online') return TargetAgent.GROQ;
      
      // Fallback to Local
      const localHealth = await this.checkLocalHealth();
      if (localHealth.status === 'online') {
        console.warn('[AIFactory] Groq offline, falling back to Local');
        return TargetAgent.LOCAL;
      }
    }
    
    throw new Error('No AI providers available');
  }
  
  /**
   * Quick classification using Groq's fast model
   */
  async quickClassify<T extends z.ZodType>(
    prompt: string,
    schema: T
  ): Promise<z.infer<T>> {
    const client = this.getGroqClient();
    
    const response = await client.chat.completions.create({
      model: GroqModels.FAST,
      messages: [
        {
          role: 'system',
          content: 'You are a JSON classifier. Respond ONLY with valid JSON matching the requested schema.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.1,
      max_tokens: 200,
      response_format: { type: 'json_object' }
    });
    
    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Empty classification response');
    
    return schema.parse(JSON.parse(content));
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// SINGLETON EXPORT
// ═══════════════════════════════════════════════════════════════════════════

let factoryInstance: AIProviderFactory | null = null;

export function getAIFactory(): AIProviderFactory {
  if (!factoryInstance) {
    factoryInstance = new AIProviderFactory();
  }
  return factoryInstance;
}

export default AIProviderFactory;
