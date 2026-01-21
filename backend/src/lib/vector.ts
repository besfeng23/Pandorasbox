// Only import server-only in Next.js context (not for standalone MCP server)
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME) {
  try {
    require('server-only');
  } catch {
    // Ignore if not in Next.js context
  }
}

import { embedText, embedTextsBatch } from './ai/embedding';
import { searchPoints } from './sovereign/qdrant-client';

/**
 * Generates an embedding for the given text using the hosted embedding model.
 * @param text The text to generate an embedding for.
 * @returns The embedding vector.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  return embedText(text);
}

/**
 * Generates embeddings for multiple texts in a single batch API call.
 * @param texts Array of texts to generate embeddings for.
 * @returns Array of embedding vectors in the same order as input texts.
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  return embedTextsBatch(texts);
}

/**
 * Searches the memories collection (via Qdrant) for documents with embeddings similar to the query text.
 * @param queryText The text to search for.
 * @param userId The ID of the user whose history we are searching.
 * @param agentId The agent ID (used to determine the Qdrant collection).
 * @param limit Maximum number of results to return.
 * @returns An array of search results with text, id, and score.
 */
export async function searchHistory(
  queryText: string,
  userId: string,
  agentId: string = 'universe',
  limit: number = 10
): Promise<{ text: string; id: string; score: number, timestamp: Date }[]> {
    if (!queryText || !userId) {
        return [];
    }
    try {
        const queryEmbedding = await generateEmbedding(queryText);
        const collectionName = `memories_${agentId}`;
        
        const qdrantResults = await searchPoints(collectionName, queryEmbedding, limit);
        
        return qdrantResults.map(res => ({
            text: res.payload?.content || '',
            id: String(res.id),
            score: res.score,
            timestamp: res.payload?.createdAt ? new Date(res.payload.createdAt) : new Date(),
        }));
    } catch (error) {
        console.warn(`Vector search failed for user ${userId} in collection memories_${agentId}`, error);
        return [];
    }
}

/**
 * Searches the memories collection (via Qdrant) for documents with embeddings similar to the query text.
 * This is now essentially the same as searchHistory but specifically for the 'memories' use case.
 * @param queryText The text to search for.
 * @param userId The ID of the user whose memories we are searching.
 * @param agentId The agent ID.
 * @param limit Maximum number of results to return.
 * @returns An array of search results with text, id, and score.
 */
export async function searchMemories(
  queryText: string,
  userId: string,
  agentId: string = 'universe',
  limit: number = 10
): Promise<{ text: string; id: string; score: number, timestamp: Date }[]> {
    return searchHistory(queryText, userId, agentId, limit);
}
