import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION = process.env.QDRANT_COLLECTION || 'memories';

export const searchUniverseMemorySchema = z.object({
  query: z.string(),
  userId: z.string(),
  limit: z.number().optional().default(5),
});

export const addUniverseMemorySchema = z.object({
  content: z.string(),
  userId: z.string(),
  agentId: z.enum(['universe', 'builder']).optional().default('universe'),
});

export async function add_universe_memory(args: z.infer<typeof addUniverseMemorySchema>) {
  const { content, userId, agentId } = args;
  const embedding = await generateEmbedding(content);
  const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ points: [{ id: uuidv4(), vector: embedding, payload: { userId, agentId, content, type: 'fact', createdAt: new Date().toISOString() } }] }),
  });
  if (!response.ok) throw new Error(`Qdrant insertion failed: ${response.status}`);
  return { success: true };
}

export async function search_universe_memory(args: z.infer<typeof searchUniverseMemorySchema>) {
  const { query, userId, limit } = args;
  const embedding = await generateEmbedding(query);
  const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ vector: embedding, filter: { must: [{ key: 'userId', match: { value: userId } }] }, limit, with_payload: true, score_threshold: 0.7 }),
  });
  if (!response.ok) throw new Error(`Qdrant search failed: ${response.status}`);
  const data = await response.json();
  const results = (data.result || []).map((p: any) => ({ content: p.payload?.content, type: p.payload?.type, score: p.score }));
  return { results, summary: `Found ${results.length} relevant memories for query: "${query}"` };
}

async function generateEmbedding(text: string): Promise<number[]> {
  const embeddingsUrl = process.env.EMBEDDINGS_BASE_URL || 'http://localhost:8080';
  const response = await fetch(`${embeddingsUrl}/embed`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
  if (!response.ok) throw new Error(`Embedding failed: ${response.status}`);
  const data = await response.json();
  return data.embedding || data.vector || [];
}
