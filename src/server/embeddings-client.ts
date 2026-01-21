'use server';

import 'server-only';
import { getServerConfig } from './config';

let dimensionCache: number | null = null;

export async function generateEmbedding(text: string): Promise<number[]> {
  const config = await getServerConfig();
  const normalizedText = text.trim();

  if (!normalizedText) {
    return Array(config.embeddingsDimension).fill(0);
  }

  const response = await fetch(`${config.embeddingsBaseUrl}/v1/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: normalizedText,
      model: 'bge-small-en-v1.5',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embeddings service failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const embedding = result.data[0].embedding;

  if (!dimensionCache) {
    dimensionCache = embedding.length;
  }

  return embedding;
}

export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) return [];

  const config = await getServerConfig();
  const normalizedTexts = texts.map(t => t.trim()).filter(t => t.length > 0);

  if (normalizedTexts.length === 0) {
    return texts.map(() => Array(config.embeddingsDimension).fill(0));
  }

  const response = await fetch(`${config.embeddingsBaseUrl}/v1/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: normalizedTexts,
      model: 'bge-small-en-v1.5',
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Embeddings batch failed: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  const embeddings = result.data.map((d: any) => d.embedding);

  // Map back to original order, filling zeros for empty texts
  const finalResults: number[][] = [];
  let resultIndex = 0;

  for (const text of texts) {
    if (text.trim().length > 0) {
      finalResults.push(embeddings[resultIndex]);
      resultIndex++;
    } else {
      finalResults.push(Array(config.embeddingsDimension).fill(0));
    }
  }

  return finalResults;
}

export async function getEmbeddingsDimension(): Promise<number> {
  if (dimensionCache) return dimensionCache;

  const testEmbedding = await generateEmbedding('test');
  dimensionCache = testEmbedding.length;
  return dimensionCache;
}
