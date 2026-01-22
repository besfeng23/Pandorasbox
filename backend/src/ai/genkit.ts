/**
 * Local Genkit Shim for Sovereign AI Stack
 * 
 * Since we are running in a Next.js environment and potentially without the full 
 * Genkit server capability, this shim provides:
 * 1. A compatible 'defineFlow' function that simply executes the logic directly.
 * 2. A 'generate' function that proxies requests to our local vLLM instance.
 */

import { z } from 'zod';
import { chatCompletion } from '@/server/inference-client';

export const ai = {
  defineFlow: <Input, Output>(
    config: { name: string; inputSchema?: z.ZodType<Input>; outputSchema?: z.ZodType<Output> },
    fn: (input: Input) => Promise<Output>
  ) => {
    // Return a function that directly executes the logic
    return async (input: Input) => {
      // In a real Genkit setup, this would handle tracing, etc.
      // For now, we just pass through.
      return await fn(input);
    };
  },

  generate: async (params: {
    model?: string;
    prompt: { text: string }[] | string;
    config?: { temperature?: number; maxOutputTokens?: number };
    output?: { format?: 'json' | 'text' };
  }) => {
    const promptText = Array.isArray(params.prompt) 
      ? params.prompt.map(p => p.text).join('\n') 
      : params.prompt;

    // Construct messages for vLLM
    const messages = [
      { role: 'user' as const, content: promptText }
    ];

    if (params.output?.format === 'json') {
      // Append instruction to force JSON if not already present
      const lastMessage = messages[messages.length - 1];
      if (!lastMessage.content.includes('JSON')) {
        lastMessage.content += '\n\nRESPOND WITH VALID JSON ONLY.';
      }
    }

    try {
      const response = await chatCompletion({
        messages,
        temperature: params.config?.temperature,
        max_tokens: params.config?.maxOutputTokens,
      });

      const content = response.choices[0]?.message?.content || '';
      
      let output: any = content;

      if (params.output?.format === 'json') {
        try {
          // Try to parse JSON from the response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            output = JSON.parse(jsonMatch[0]);
          } else {
            output = JSON.parse(content);
          }
        } catch (e) {
          console.warn('[Genkit Shim] Failed to parse JSON response:', content);
          // Fallback to raw text if parsing fails, but return as object if possible
          output = { error: 'Failed to parse JSON', raw: content };
        }
      }

      return {
        text: content,
        output: output,
      };
    } catch (error) {
      console.error('[Genkit Shim] Generation failed:', error);
      throw error;
    }
  }
};
