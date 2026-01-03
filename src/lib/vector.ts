'server-only';

import OpenAI from 'openai';
import { getFirestoreAdmin } from './firebase-admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


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

  const response = await openai.embeddings.create({
    model: 'text-embedding-3-small',
    input: normalizedText,
  });
  return response.data[0].embedding;
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
}
