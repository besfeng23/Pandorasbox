import type { AgentId } from './agent-types';
import { getAgentConfig } from './agent-types';

export interface PromptContext {
  agentId: AgentId;
  uid: string;
  worldState?: Record<string, any> | null;
  canon?: Record<string, string>;
  preferences?: Record<string, any>;
  retrievedMemories?: { content: string; score: number }[];
  recentMessages?: { role: 'user' | 'assistant'; content: string }[];
  userMessage: string;
}

const MAX_SYSTEM_CHARS = 8000;
const MAX_MEMORY_CHARS = 3000;
const MAX_RECENT_CHARS = 2000;

export function buildSystemPrompt(ctx: PromptContext): string {
  const config = getAgentConfig(ctx.agentId);
  const parts: string[] = [];

  // Base system prompt
  parts.push(config.systemPrompt);

  // World state (Universe only)
  if (ctx.agentId === 'universe' && ctx.worldState) {
    const worldStateStr = Object.entries(ctx.worldState)
      .filter(([k]) => !['uid', 'agentId', 'updatedAt'].includes(k))
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join('\n');

    if (worldStateStr) {
      parts.push(`\n--- WORLD STATE ---\n${worldStateStr.substring(0, 500)}`);
    }
  }

  // Canon facts
  if (ctx.canon && Object.keys(ctx.canon).length > 0) {
    const canonStr = Object.entries(ctx.canon)
      .map(([k, v]) => `- ${k}: ${v}`)
      .join('\n')
      .substring(0, 500);

    parts.push(`\n--- ESTABLISHED FACTS ---\n${canonStr}`);
  }

  // Preferences
  if (ctx.preferences && Object.keys(ctx.preferences).length > 0) {
    const prefStr = Object.entries(ctx.preferences)
      .map(([k, v]) => `- ${k}: ${JSON.stringify(v)}`)
      .join('\n')
      .substring(0, 300);

    parts.push(`\n--- USER PREFERENCES ---\n${prefStr}`);
  }

  // Retrieved memories
  if (ctx.retrievedMemories && ctx.retrievedMemories.length > 0) {
    let memoryStr = ctx.retrievedMemories
      .map((m, i) => `[Memory ${i + 1}] ${m.content}`)
      .join('\n');

    if (memoryStr.length > MAX_MEMORY_CHARS) {
      memoryStr = `${memoryStr.substring(0, MAX_MEMORY_CHARS)}...`;
    }

    parts.push(`\n--- RELEVANT MEMORIES ---\n${memoryStr}`);
  }

  let systemPrompt = parts.join('\n');

  // Hard cap
  if (systemPrompt.length > MAX_SYSTEM_CHARS) {
    systemPrompt = `${systemPrompt.substring(0, MAX_SYSTEM_CHARS)}\n[truncated]`;
  }

  return systemPrompt;
}

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export function buildMessages(ctx: PromptContext): ChatMessage[] {
  const messages: ChatMessage[] = [];

  // System prompt
  messages.push({
    role: 'system',
    content: buildSystemPrompt(ctx),
  });

  // Recent conversation history
  if (ctx.recentMessages && ctx.recentMessages.length > 0) {
    let totalChars = 0;
    const recentToInclude: typeof ctx.recentMessages = [];

    // Take messages from most recent, respecting char limit
    for (let i = ctx.recentMessages.length - 1; i >= 0; i--) {
      const msg = ctx.recentMessages[i];
      if (totalChars + msg.content.length > MAX_RECENT_CHARS) break;
      recentToInclude.unshift(msg);
      totalChars += msg.content.length;
    }

    for (const msg of recentToInclude) {
      messages.push({
        role: msg.role,
        content: msg.content,
      });
    }
  }

  // Current user message
  messages.push({
    role: 'user',
    content: ctx.userMessage,
  });

  return messages;
}
