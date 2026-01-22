
import { Timestamp } from 'firebase/firestore';

export interface ChangeHistoryItem {
  timestamp: Timestamp | Date;
  userId: string;
  action: string;
  changes?: Record<string, any>;
}

export interface ToolUsage {
  toolName: string;
  input: any;
  output: any;
  citation?: string;
}

export interface Thread {
  id: string;
  name: string;
  agent: 'builder' | 'universe';
  userId: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
  history?: ChangeHistoryItem[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  isError?: boolean;
  confidence?: number;
  toolUsages?: ToolUsage[];
  history: ChangeHistoryItem[];
}

export interface Memory {
  id: string;
  userId: string;
  type: 'fact' | 'preference' | 'commitment' | 'person' | 'place';
  content: string;
  relevance: number;
  confidence: number;
  sourceMessageId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
  history: ChangeHistoryItem[];
}

export interface CustomAgent {
  id: string;
  userId: string;
  agentName: string;
  description: string;
  systemPrompt?: string;
  behaviorRules?: string;
  domainConstraints?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  version: number;
  history: ChangeHistoryItem[];
}

export interface UserConnector {
  id: string;
  userId: string;
  status: 'connected' | 'error' | 'disconnected';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  metadata?: {
    url?: string;
  };
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  timestamp: string;
}