/**
 * Phase 3: Context Manager
 * 
 * Provides weighted recall that combines similarity, recency, and importance
 */

import { searchMemories } from './vector';
import { getMemoryImportance, updateContextSession } from './context-store';
import { Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from './firebase-admin';

export interface WeightedMemory {
  id: string;
  text: string;
  similarityScore: number; // From vector search (0-1)
  recencyScore: number; // Based on age (0-1)
  importance: number; // From context store (0-1)
  finalWeightedScore: number; // Combined score
  timestamp: Date;
}

const RECENCY_DECAY_DAYS = 90; // Memories older than 90 days get low recency score
const SIMILARITY_WEIGHT = 0.5; // 50% weight on semantic similarity
const RECENCY_WEIGHT = 0.25; // 25% weight on recency
const IMPORTANCE_WEIGHT = 0.25; // 25% weight on importance

/**
 * Calculates recency score based on memory age
 */
function calculateRecencyScore(createdAt: Date): number {
  const now = Date.now();
  const ageMs = now - createdAt.getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);

  if (ageDays <= 0) return 1.0; // Brand new
  if (ageDays >= RECENCY_DECAY_DAYS) return 0.1; // Very old

  // Exponential decay: newer memories score higher
  return Math.max(0.1, 1.0 - (ageDays / RECENCY_DECAY_DAYS) * 0.9);
}

/**
 * Gets memories with contextual weighting
 */
export async function getContextualMemories(
  query: string,
  userId: string,
  limit: number = 10,
  sessionId?: string
): Promise<WeightedMemory[]> {
  // Get vector search results
  const searchResults = await searchMemories(query, userId, limit * 2); // Get more to filter

  if (searchResults.length === 0) {
    return [];
  }

  // Get memory documents to check importance from Firestore
  const firestoreAdmin = getFirestoreAdmin();
  const memoriesRef = firestoreAdmin.collection('memories');

  // Fetch memory documents to get importance and createdAt
  const memoryDocs = await Promise.all(
    searchResults.map(async (result) => {
      const doc = await memoriesRef.doc(result.id).get();
      return {
        id: result.id,
        doc: doc.exists ? doc : null,
        result,
      };
    })
  );

  // Get all importance values from context store in parallel
  const importanceMap = new Map<string, number>();
  await Promise.all(
    searchResults.map(async (result) => {
      const importance = await getMemoryImportance(userId, result.id, sessionId);
      importanceMap.set(result.id, importance);
    })
  );

  // Calculate weighted scores
  const weightedMemories: WeightedMemory[] = [];

  for (const { id, doc, result } of memoryDocs) {
    const memoryData = doc?.data();
    
    // Get memory importance from Firestore if available, otherwise use context store
    const memoryImportance = memoryData?.importance ?? (importanceMap.get(id) ?? 0.5);

    // Calculate recency score
    const createdAt = result.timestamp;
    const recencyScore = calculateRecencyScore(createdAt);

    // Calculate final weighted score
    const finalScore =
      result.score * SIMILARITY_WEIGHT +
      recencyScore * RECENCY_WEIGHT +
      memoryImportance * IMPORTANCE_WEIGHT;

    weightedMemories.push({
      id,
      text: result.text,
      similarityScore: result.score,
      recencyScore,
      importance: memoryImportance,
      finalWeightedScore: finalScore,
      timestamp: createdAt,
    });
  }

  // Sort by final weighted score (highest first)
  weightedMemories.sort((a, b) => b.finalWeightedScore - a.finalWeightedScore);

  // Update context session with accessed memories
  const topMemoryIds = weightedMemories.slice(0, limit).map(m => m.id);
  await updateContextSession(userId, topMemoryIds, sessionId).catch(err => {
    console.warn('Failed to update context session:', err);
  });

  return weightedMemories.slice(0, limit);
}

