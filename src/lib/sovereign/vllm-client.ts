import { INFERENCE_URL, INFERENCE_MODEL } from './config';
import { logEvent } from '@/lib/observability/logger';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string | any[];
};

export async function chatCompletion(messages: ChatMessage[], options: { temperature?: number; max_tokens?: number } = {}) {
  const startTime = Date.now();
  try {
    const response = await fetch(`${INFERENCE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: INFERENCE_MODEL,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.max_tokens ?? 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`vLLM request failed: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    const endTime = Date.now();

    logEvent('AI_REQUEST', {
      duration: endTime - startTime,
      input_messages: messages.length,
      output_chars: content.length,
      model: data.model,
      usage: data.usage
    });

    return content;
  } catch (error: any) {
    const endTime = Date.now();
    logEvent('ERROR', {
      type: 'AI_REQUEST_FAILED',
      duration: endTime - startTime,
      error: error.message
    });
    console.error('Sovereign AI connection failed:', error);
    return "I cannot reach my brain right now. Please check if the vLLM service is running.";
  }
}

