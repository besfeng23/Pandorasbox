'use server';

import { embedText } from '@/lib/ai/embedding';

export async function getEmbedding(text: string): Promise<number[]> {
  // Placeholder for getting a single embedding
  return embedText(text);
}

export async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  // Placeholder for getting a batch of embeddings
  return Promise.all(texts.map(text => embedText(text)));
}

