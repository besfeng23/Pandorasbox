/**
 * MCP-specific type definitions for Pandora's Box MCP Server
 */

export interface SearchKnowledgeBaseParams {
  query: string;
  user_email: string;
  limit?: number;
}

export interface SearchKnowledgeBaseResult {
  id: string;
  content: string;
  score: number;
  timestamp: string;
}

export interface AddMemoryParams {
  memory: string;
  user_email: string;
}

export interface AddMemoryResult {
  success: boolean;
  memory_id: string;
  user_id: string;
}

export interface GenerateArtifactParams {
  title: string;
  type: 'code' | 'markdown';
  content: string;
  user_email: string;
}

export interface GenerateArtifactResult {
  success: boolean;
  artifact_id: string;
  title: string;
}

export interface MCPError {
  code: string;
  message: string;
  details?: any;
}

