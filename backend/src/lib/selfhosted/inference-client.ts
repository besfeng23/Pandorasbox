'use server';

import { Message } from "@/lib/types";

export async function chatCompletion(messages: Message[]): Promise<string> {
  // Placeholder for AI inference call
  console.log("[InferenceClient] Calling chat completion with messages:", messages);
  return "This is a placeholder AI response.";
}

