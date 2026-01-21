'use server';

import { getFirestoreAdmin } from './firebase-admin';
import { embedText } from '@/lib/ai/embedding'; // Import embedText

export async function runRetrieval(searchQueries: string[], uid: string, agentId: string) {
  const adminDb = getFirestoreAdmin();
  console.log("Performing vector retrieval with queries:", searchQueries);

  const allResults: any[] = [];

  for (const queryText of searchQueries) {
    if (!queryText.trim()) continue;

    const queryVector = await embedText(queryText);
    
    // Perform vector search in the agent's history collection
    const historyColl = adminDb.collection(`users/${uid}/agents/${agentId}/history`);
    const historyVectorQuery = historyColl.findNearest('embedding', queryVector, { limit: 5, distanceMeasure: 'COSINE' });
    const historySnapshot = await historyVectorQuery.get();
    const historyDocs = historySnapshot.docs.map(doc => ({
      id: doc.id,
      text: doc.data().content,
      score: 1 - (doc as any).distance, // Convert distance to score
      type: 'history',
    }));

    // Perform vector search in the agent's memories collection
    const memoriesColl = adminDb.collection(`users/${uid}/agents/${agentId}/memories`);
    const memoriesVectorQuery = memoriesColl.findNearest('embedding', queryVector, { limit: 5, distanceMeasure: 'COSINE' });
    const memoriesSnapshot = await memoriesVectorQuery.get();
    const memoriesDocs = memoriesSnapshot.docs.map(doc => ({
      id: doc.id,
      text: doc.data().content,
      score: 1 - (doc as any).distance, // Convert distance to score
      type: 'memory',
    }));

    allResults.push(...historyDocs, ...memoriesDocs);
  }

  // Sort all results by score and return top unique ones
  const uniqueResults = Array.from(new Map(allResults.map(item => [item.id, item])).values());
  return uniqueResults.sort((a, b) => b.score - a.score).slice(0, 10);
}
