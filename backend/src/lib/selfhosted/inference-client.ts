'use server';

import { Message } from "@/lib/types";
import { chatCompletion as realChatCompletion } from '@/server/inference-client';

export async function chatCompletion(messages: Message[]): Promise<string> {
  const vllmMessages = messages.map(m => ({
    role: m.role as 'user' | 'assistant' | 'system',
    content: m.content
  }));

  const completion = await realChatCompletion({
    messages: vllmMessages,
  });

  return completion.choices[0].message.content || "";
}
