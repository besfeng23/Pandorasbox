// Only import server-only in Next.js context (not for standalone MCP server)
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME) {
  try {
    require('server-only');
  } catch {
    // Ignore if not in Next.js context
  }
}

import { embed, embedMany } from 'genkit';
import { textEmbedding004 } from '@genkit-ai/vertexai';
import { getFirestoreAdmin } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

/**
 * Generates an embedding for the given text using Vertex AI's embedding model via Genkit.
 * @param text The text to generate an embedding for.
 * @returns The embedding vector.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Normalize the text to reduce noise.
  const normalizedText = text.trim();
  if (!normalizedText) {
    // Return a zero vector for empty strings.
    // Vertex AI text-embedding-004 dimension is 768.
    return Array(768).fill(0);
  }

  const embedding = await embed({
    embedder: textEmbedding004,
    content: normalizedText,
  });
  return embedding;
}

/**
 * Generates embeddings for multiple texts in a single batch API call.
 * This is more cost-efficient than generating embeddings one at a time.
 * @param texts Array of texts to generate embeddings for.
 * @returns Array of embedding vectors in the same order as input texts.
 */
export async function generateEmbeddingsBatch(texts: string[]): Promise<number[][]> {
  if (texts.length === 0) {
    return [];
  }

  // Normalize and filter out empty texts
  const normalizedTexts = texts
    .map(text => text.trim())
    .filter(text => text.length > 0);

  if (normalizedTexts.length === 0) {
    // Return zero vectors for all empty texts
    return texts.map(() => Array(768).fill(0));
  }

  // Vertex AI supports batching, but Genkit's embedMany handles it.
  // We'll trust embedMany to batch appropriately or the underlying plugin.
  const embeddings = await embedMany({
    embedder: textEmbedding004,
    content: normalizedTexts,
  });

  // Map results back to original positions (accounting for filtered empty texts)
  const results: number[][] = [];
  let resultIndex = 0;
  
  for (const text of texts) {
    if (text.trim().length > 0) {
      results.push(embeddings[resultIndex]);
      resultIndex++;
    } else {
      results.push(Array(768).fill(0));
    }
  }

  return results;
}

/**
 * Searches the history collection for documents with embeddings similar to the query text.
 * @param queryText The text to search for.
 * @param userId The ID of the user whose history we are searching.
 * @returns An array of search results with text, id, and score.
 */
export async function searchHistory(
  queryText: string,
  userId: string
): Promise<{ text: string; id: string; score: number, timestamp: Date }[]> {
    if (!queryText || !userId) {
        return [];
    }
    const firestoreAdmin = getFirestoreAdmin();
    try {
        const queryEmbedding = await generateEmbedding(queryText);

        // CORRECT: Query the root 'history' collection and filter by userId
        const historyCollection = firestoreAdmin.collection('history');
      
        const vectorQuery = historyCollection
          .where('userId', '==', userId)
          .findNearest('embedding', queryEmbedding, {
            limit: 10,
            distanceMeasure: 'COSINE',
        });
      
        const snapshot = await vectorQuery.get();
      
        return snapshot.docs.map(doc => {
          const data = doc.data();
          // The distance is a value between 0 and 2, where 0 is most similar.
          // We can convert it to a "score" from 0 to 1, where 1 is most similar.
          const score = 1 - ((doc as any).distance || 1); 
          
          let timestamp: Date;
          if (data.createdAt instanceof Timestamp) {
              timestamp = data.createdAt.toDate();
          } else {
              // Fallback for any other format, though less likely with Firestore Admin SDK
              timestamp = new Date(data.createdAt);
          }
          
          return {
            text: data.content,
            id: doc.id,
            score: score,
            timestamp: timestamp,
          };
        });
    } catch (error) {
        console.warn(`Vector search failed for user ${userId}. This might be because the vector index is still building.`, error);
        return [];
    }
}

/**
 * Searches the memories collection for documents with embeddings similar to the query text.
 * @param queryText The text to search for.
 * @param userId The ID of the user whose memories we are searching.
 * @param limit Maximum number of results to return (default: 10).
 * @returns An array of search results with text, id, and score.
 */
export async function searchMemories(
  queryText: string,
  userId: string,
  limit: number = 10
): Promise<{ text: string; id: string; score: number, timestamp: Date }[]> {
    if (!queryText || !userId) {
        return [];
    }
    const firestoreAdmin = getFirestoreAdmin();
    try {
        const queryEmbedding = await generateEmbedding(queryText);

        // Query the 'memories' collection and filter by userId
        const memoriesCollection = firestoreAdmin.collection('memories');
      
        const vectorQuery = memoriesCollection
          .where('userId', '==', userId)
          .findNearest('embedding', queryEmbedding, {
            limit: limit,
            distanceMeasure: 'COSINE',
        });
      
        const snapshot = await vectorQuery.get();
        
        console.log(`[searchMemories] Vector search found ${snapshot.docs.length} memories for user ${userId}`);
      
        const results = snapshot.docs.map(doc => {
          const data = doc.data();
          // The distance is a value between 0 and 2, where 0 is most similar.
          // We can convert it to a "score" from 0 to 1, where 1 is most similar.
          let score = 1 - ((doc as any).distance || 1);
          
          // Boost insight memories - they represent learned patterns and should be prioritized
          if (data.type === 'insight') {
            score = Math.min(1.0, score * 1.2); // Boost by 20%, cap at 1.0
          }
          
          let timestamp: Date;
          if (data.createdAt instanceof Timestamp) {
              timestamp = data.createdAt.toDate();
          } else {
              // Fallback for any other format, though less likely with Firestore Admin SDK
              timestamp = new Date(data.createdAt);
          }
          
          return {
            text: data.content,
            id: doc.id,
            score: score,
            timestamp: timestamp,
            type: data.type || 'normal', // Include type for filtering/prioritization
          };
        });
        
        // Sort by score (highest first) to ensure insights appear at top
        results.sort((a, b) => b.score - a.score);
        
        // Separate insights and normal memories for explicit prioritization
        const insights = results.filter(r => r.type === 'insight');
        const normalMemories = results.filter(r => r.type !== 'insight');
        
        // Prioritize insights: put them at the top even if score is slightly lower
        const prioritizedResults = [...insights, ...normalMemories]
          .slice(0, limit);
        
        // If vector search returns no results, try fallback text search
        if (prioritizedResults.length === 0) {
          console.log(`[searchMemories] Vector search returned 0 results, trying fallback text search...`);
          return await searchMemoriesFallback(queryText, userId, limit);
        }
        
        return prioritizedResults.map(r => ({
          text: r.text,
          id: r.id,
          score: r.score,
          timestamp: r.timestamp,
        }));
    } catch (error: any) {
        console.error(`[searchMemories] Vector search failed for memories for user ${userId}:`, error);
        console.error(`[searchMemories] Error details:`, {
          message: error.message,
          code: error.code,
          stack: error.stack?.substring(0, 500)
        });
        
        // Try fallback text search on error
        console.log(`[searchMemories] Attempting fallback text search...`);
        try {
          return await searchMemoriesFallback(queryText, userId, limit);
        } catch (fallbackError) {
          console.error(`[searchMemories] Fallback search also failed:`, fallbackError);
          return [];
        }
    }
}

/**
 * Fallback text-based search for memories when vector search fails
 */
async function searchMemoriesFallback(
  queryText: string,
  userId: string,
  limit: number = 10
): Promise<{ text: string; id: string; score: number, timestamp: Date }[]> {
  const firestoreAdmin = getFirestoreAdmin();
  const memoriesCollection = firestoreAdmin.collection('memories');
  
  try {
    // Get all memories for user and filter by text content
    const snapshot = await memoriesCollection
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(100) // Get more to filter
      .get();
    
    console.log(`[searchMemoriesFallback] Found ${snapshot.size} total memories for user ${userId}`);
    
    const queryLower = queryText.toLowerCase();
    const queryWords = queryLower.split(/\s+/).filter(w => w.length > 2);
    
    const results = snapshot.docs
      .map(doc => {
        const data = doc.data();
        const content = (data.content || '').toLowerCase();
        
        // Simple text matching score
        let score = 0;
        for (const word of queryWords) {
          if (content.includes(word)) {
            score += 1;
          }
        }
        score = score / Math.max(queryWords.length, 1);
        
        let timestamp: Date;
        if (data.createdAt instanceof Timestamp) {
          timestamp = data.createdAt.toDate();
        } else {
          timestamp = new Date(data.createdAt);
        }
        
        return {
          text: data.content || '',
          id: doc.id,
          score: score,
          timestamp: timestamp,
        };
      })
      .filter(r => r.score > 0) // Only return results with some match
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
    
    console.log(`[searchMemoriesFallback] Returning ${results.length} text-matched results`);
    return results;
  } catch (error) {
    console.error(`[searchMemoriesFallback] Error in fallback search:`, error);
    return [];
  }
}