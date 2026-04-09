export type ChatRole = 'system' | 'user' | 'assistant';

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
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
