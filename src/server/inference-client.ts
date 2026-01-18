'use server';

import 'server-only';
import { getServerConfig } from './config';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface ChatCompletionRequest {
    messages: ChatMessage[];
    temperature?: number;
    max_tokens?: number;
    top_p?: number;
    stop?: string[];
}

export interface ChatCompletionResponse {
    id: string;
    choices: {
      index: number;
      message: ChatMessage;
      finish_reason: string;
    }[];
    usage: {
      prompt_tokens: number;
      completion_tokens: number;
      total_tokens: number;
    };
}

export async function chatCompletion(request: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    const config = await getServerConfig();

  const response = await fetch(`${config.inferenceBaseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
                'Content-Type': 'application/json',
        },
        body: JSON.stringify({
                model: config.inferenceModel,
                messages: request.messages,
                temperature: request.temperature ?? 0.7,
                max_tokens: request.max_tokens ?? 2048,
                top_p: request.top_p ?? 0.95,
                stop: request.stop,
        }),
  });

  if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`vLLM inference failed: ${response.status} - ${errorText}`);
  }

  return response.json();
}
