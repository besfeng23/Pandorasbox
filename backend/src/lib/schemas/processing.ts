/**
 * Processing status and job tracking schemas
 */

export type ProcessingStatus = 'PENDING' | 'CHUNKING' | 'EMBEDDING' | 'INDEXING' | 'COMPLETED' | 'FAILED';

export interface ProcessingJob {
  id: string; // Unique Job ID (UUID)
  userId: string;
  agentId: string;
  filename: string;
  status: ProcessingStatus;
  totalChunks: number;
  processedChunks: number;
  createdAt: Date;
  updatedAt: Date;
  error?: string;
}

