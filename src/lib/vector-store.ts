'use server';

import { generateEmbedding, generateEmbeddingsBatch } from '@/server/embeddings-client';
import {
  upsertPoints,
  searchPoints,
  deletePoints,
  ensureCollectionsInitialized,
} from '@/server/qdrant-client';
import type { AgentId } from './agent-types';
import { v4 as uuidv4 } from 'uuid';

export { ensureCollectionsInitialized };

export interface MemoryDocument {
  id?: string;
  content: string;
  uid: string;
  agentId: AgentId;
  source?: string;
  type?: string;
  metadata?: Record<string, any>;
}

export interface SearchResultWithContent {
  id: string;
  content: string;
  score: number;
  source?: string;
  type?: string;
  createdAt: string;
}

export async function indexMemory(doc: MemoryDocument): Promise<string> {
  await ensureCollectionsInitialized();

  const embedding = await generateEmbedding(doc.content);
  const id = doc.id || uuidv4();

  await upsertPoints(doc.agentId, [
    {
      id,
      vector: embedding,
      payload: {
        uid: doc.uid,
        agentId: doc.agentId,
        content: doc.content,
        source: doc.source || 'unknown',
        type: doc.type || 'memory',
        createdAt: new Date().toISOString(),
        ...doc.metadata,
      },
    },
  ]);

  return id;
}

export async function indexMemoriesBatch(docs: MemoryDocument[]): Promise<string[]> {
  if (docs.length === 0) return [];

  await ensureCollectionsInitialized();

  const contents = docs.map(d => d.content);
  const embeddings = await generateEmbeddingsBatch(contents);

  // Group by agentId
  const byAgent: Record<AgentId, { doc: MemoryDocument; embedding: number[]; id: string }[]> = {
    builder: [],
    universe: [],
  };

  const ids: string[] = [];

  docs.forEach((doc, i) => {
    const id = doc.id || uuidv4();
    ids.push(id);
    byAgent[doc.agentId].push({
      doc,
      embedding: embeddings[i],
      id,
    });
  });

  // Upsert each agent's points
  for (const agentId of ['builder', 'universe'] as AgentId[]) {
    const agentDocs = byAgent[agentId];
    if (agentDocs.length === 0) continue;

    await upsertPoints(
      agentId,
      agentDocs.map(({ doc, embedding, id }) => ({
        id,
        vector: embedding,
        payload: {
          uid: doc.uid,
          agentId: doc.agentId,
          content: doc.content,
          source: doc.source || 'unknown',
          type: doc.type || 'memory',
          createdAt: new Date().toISOString(),
          ...doc.metadata,
        },
      })),
    );
  }

  return ids;
}

export async function searchMemories(
  query: string,
  uid: string,
  agentId: AgentId,
  limit: number = 10,
): Promise<SearchResultWithContent[]> {
  await ensureCollectionsInitialized();

  const queryEmbedding = await generateEmbedding(query);
  const results = await searchPoints(agentId, queryEmbedding, uid, limit);

  return results.map(r => ({
    id: r.id,
    content: r.payload.content,
    score: r.score,
    source: r.payload.source,
    type: r.payload.type,
    createdAt: r.payload.createdAt,
  }));
}

export async function deleteAllMemories(uid: string, agentId: AgentId): Promise<void> {
  await ensureCollectionsInitialized();
  await deletePoints(agentId, uid);
}
