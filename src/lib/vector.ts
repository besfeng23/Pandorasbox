'server-only';

import OpenAI from 'openai';
import { getFirestoreAdmin } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

// Lazy initialization to avoid build-time errors
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Please set it in your environment variables.');
  }
  return new OpenAI({ apiKey });
}


/**
 * Generates an embedding for the given text using OpenAI's embedding model.
 * @param text The text to generate an embedding for.
 * @returns The embedding vector.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Normalize the text to reduce noise.
  const normalizedText = text.trim().toLowerCase();
  if (!normalizedText) {
    // Return a zero vector for empty strings to avoid OpenAI API errors.
    // The dimension should match the model's output dimension.
    return Array(1536).fill(0);
  }

  const openai = getOpenAI();
  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: normalizedText,
  });
  return response.data[0].embedding;
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
    .map(text => text.trim().toLowerCase())
    .filter(text => text.length > 0);

  if (normalizedTexts.length === 0) {
    // Return zero vectors for all empty texts
    return texts.map(() => Array(1536).fill(0));
  }

  // OpenAI supports up to 2048 inputs per batch
  const batchSize = 100; // Conservative batch size to avoid token limits
  const results: number[][] = [];

  for (let i = 0; i < normalizedTexts.length; i += batchSize) {
    const batch = normalizedTexts.slice(i, i + batchSize);
    
    const openai = getOpenAI();
    const response = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: batch,
    });

    // Map results back to original positions (accounting for filtered empty texts)
    const batchEmbeddings = response.data.map(item => item.embedding);
    results.push(...batchEmbeddings);
  }

  // Fill in zero vectors for any empty texts that were filtered out
  const finalResults: number[][] = [];
  let resultIndex = 0;
  
  for (const text of texts) {
    if (text.trim().toLowerCase().length > 0) {
      finalResults.push(results[resultIndex]);
      resultIndex++;
    } else {
      finalResults.push(Array(1536).fill(0));
    }
  }

  return finalResults;
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
          const score = 1 - doc.distance; 
          
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
      
        return snapshot.docs.map(doc => {
          const data = doc.data();
          // The distance is a value between 0 and 2, where 0 is most similar.
          // We can convert it to a "score" from 0 to 1, where 1 is most similar.
          const score = 1 - doc.distance; 
          
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
        console.warn(`Vector search failed for memories for user ${userId}. This might be because the vector index is still building.`, error);
        return [];
    }
}