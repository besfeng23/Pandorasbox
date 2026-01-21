'use server';

import { embedText, embedTextsBatch } from '@/lib/ai/embedding';

export async function getEmbedding(text: string): Promise<number[]> {
  return embedText(text);
}

export async function getEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  return embedTextsBatch(texts);
}
