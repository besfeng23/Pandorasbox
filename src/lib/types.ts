
import type { Timestamp } from 'firebase/firestore';

export type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Timestamp | Date;
  embedding?: number[];
  imageUrl?: string;
  imageDescription?: string;
  source?: 'text' | 'voice';
  type?: 'briefing' | 'standard' | 'knowledge_chunk';
  status?: 'processing' | 'complete' | 'error';
  progress_log?: string[];
  source_filename?: string;
};

export type Memory = {
  id: string;
  content: string;
  embedding: number[];
  timestamp: Timestamp | Date;
};

export type AppSettings = {
    active_model: 'gpt-4o' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
    reply_style: 'concise' | 'detailed';
    system_prompt_override: string;
};

export type SearchResult = {
  id: string;
  text: string;
  score: number;
  timestamp: string;
};

export type Artifact = {
  id: string;
  userId: string;
  title: string;
  type: 'markdown' | 'code';
  content: string;
  version: number;
  createdAt: Timestamp | Date;
};
