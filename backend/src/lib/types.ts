import { Timestamp } from 'firebase/firestore';

// --- FRONTEND TYPES (Merged) ---

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
  createdAt: Timestamp; // Using Firestore Timestamp
  updatedAt: Timestamp;
  version: number;
  history?: ChangeHistoryItem[];
  pinned?: boolean; // Frontend property
  archived?: boolean; // Frontend property
  title?: string; // Frontend alias for name
  summary?: string; // Frontend property
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  isError?: boolean;
  confidence?: number;
  toolUsages?: ToolUsage[];
  history: ChangeHistoryItem[];
  source?: string;
  imageUrl?: string;
  status?: string;
  progress_log?: any[];
}

export interface Memory {
  id: string;
  userId: string;
  type?: 'fact' | 'preference' | 'commitment' | 'person' | 'place';
  content: string;
  relevance?: number;
  confidence?: number;
  sourceMessageId?: string;
  createdAt: Timestamp | Date; // Allow Date
  updatedAt?: Timestamp | Date; // Allow Date
  version?: number;
  history?: ChangeHistoryItem[];
  source?: string; // Frontend property
  score?: number; // Frontend property for search results
  embedding?: number[];
}

export interface SearchResult {
  id: string;
  text: string;
  score: number;
  timestamp: string;
  payload?: any;
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

export interface Artifact {
    id: string;
    userId?: string;
    title: string;
    type: 'code' | 'markdown' | 'html' | 'svg' | 'react';
    content: string;
    language?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface AppSettings {
    theme: 'light' | 'dark' | 'system';
    active_model?: string;
    reply_style?: 'concise' | 'detailed' | 'creative';
    system_prompt_override?: string;
    personal_api_key?: string;
}

// --- BACKEND SPECIFIC TYPES (if any unique) ---
// (Already covered by interfaces above generally)
