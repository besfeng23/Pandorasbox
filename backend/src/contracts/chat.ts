export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatToolUsage {
  toolName: string;
  input?: unknown;
  output?: unknown;
  citation?: string;
}

export interface ChatMessageMetadata {
  reasoning?: string;
  toolUsages?: ChatToolUsage[];
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  metadata?: ChatMessageMetadata;
}

export interface Conversation {
  id: string;
  name: string;
  agentId: 'builder' | 'universe';
  workspaceId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ChatRequest {
  message: string;
  conversationId?: string | null;
  agentId?: 'builder' | 'universe';
  workspaceId?: string | null;
}

export interface ChatListResponse {
  conversations: Conversation[];
}

export interface ChatDetailResponse {
  conversation: Conversation;
  messages: ChatMessage[];
}
