
import { Message } from "@/lib/types";

export function buildPrompt(agentId: string, recentMessages: Message[], memories: any[]): Message[] {
  // Placeholder for prompt building logic based on agent, recent messages, and retrieved memories
  console.log(`[PromptBuilder] Building prompt for agent ${agentId}`);
  const systemPrompt = `You are a ${agentId} AI assistant.`;
    return [{
      id: `system-${Date.now()}`,
      createdAt: new Date() as any,
      role: "system",
      content: systemPrompt,
      history: []
    }, ...recentMessages];
}

