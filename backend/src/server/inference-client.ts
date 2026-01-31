import { completeInference, ChatMessage as SovereignChatMessage } from '@/lib/sovereign/inference';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionRequest {
  messages: ChatMessage[];
  temperature?: number;
}

export interface ChatCompletionResponse {
  choices: {
    message: ChatMessage;
  }[];
}

/**
 * server-side wrapper for non-streaming inference
 * Re-routes to the centralized sovereign inference engine
 */
export async function chatCompletion(
  request: ChatCompletionRequest,
): Promise<ChatCompletionResponse> {
  const content = await completeInference(
    request.messages as SovereignChatMessage[],
    request.temperature
  );

  return {
    choices: [{
      message: { role: 'assistant', content },
    }]
  };
}
