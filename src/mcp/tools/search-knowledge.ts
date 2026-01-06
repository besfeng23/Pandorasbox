'use server';

import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { searchHistory, searchMemories, generateEmbedding } from '@/lib/vector';
import { SearchKnowledgeBaseParams, SearchKnowledgeBaseResult } from '../types';
import { Timestamp } from 'firebase-admin/firestore';

/**
 * Maps user email to Firebase UID
 */
async function getUserUidFromEmail(email: string): Promise<string> {
  const authAdmin = getAuthAdmin();
  try {
    const user = await authAdmin.getUserByEmail(email);
    return user.uid;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error(`User with email ${email} not found. Please ensure the user account exists in Firebase.`);
    }
    throw error;
  }
}

/**
 * Enhanced search that searches both history and memories collections
 */
async function searchKnowledgeBase(
  queryText: string,
  userId: string,
  limit: number = 10
): Promise<SearchKnowledgeBaseResult[]> {
  const firestoreAdmin = getFirestoreAdmin();
  
  try {
    const queryEmbedding = await generateEmbedding(queryText);
    
    // Search history collection
    const historyCollection = firestoreAdmin.collection('history');
    const historyVectorQuery = historyCollection
      .where('userId', '==', userId)
      .findNearest('embedding', queryEmbedding, {
        limit: Math.ceil(limit / 2),
        distanceMeasure: 'COSINE'
      });
    const historySnapshot = await historyVectorQuery.get();
    const historyDocs = historySnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      distance: doc.distance,
      collection: 'history'
    }));
    
    // Search memories collection
    const memoriesCollection = firestoreAdmin.collection('memories');
    const memoriesVectorQuery = memoriesCollection
      .where('userId', '==', userId)
      .findNearest('embedding', queryEmbedding, {
        limit: Math.ceil(limit / 2),
        distanceMeasure: 'COSINE'
      });
    const memoriesSnapshot = await memoriesVectorQuery.get();
    const memoriesDocs = memoriesSnapshot.docs.map(doc => ({
      ...doc.data(),
      id: doc.id,
      distance: doc.distance,
      collection: 'memories'
    }));
    
    // Combine and sort by distance (lower = more relevant)
    const allDocs = [...historyDocs, ...memoriesDocs]
      .sort((a, b) => (a.distance || 1) - (b.distance || 1))
      .slice(0, limit);
    
    return allDocs.map(doc => {
      const score = 1 - (doc.distance || 1);
      let timestamp: Date;
      
      if (doc.createdAt instanceof Timestamp) {
        timestamp = doc.createdAt.toDate();
      } else if (doc.createdAt instanceof Date) {
        timestamp = doc.createdAt;
      } else {
        timestamp = new Date();
      }
      
      return {
        id: doc.id,
        content: doc.content || '',
        score: Math.max(0, Math.min(1, score)), // Clamp between 0 and 1
        timestamp: timestamp.toISOString(),
      };
    });
  } catch (error: any) {
    console.error('Error in searchKnowledgeBase:', error);
    // Fallback to regular searchHistory if vector search fails
    try {
      const results = await searchHistory(queryText, userId);
      return results.slice(0, limit).map(r => ({
        id: r.id,
        content: r.text,
        score: r.score,
        timestamp: r.timestamp.toISOString(),
      }));
    } catch (fallbackError) {
      console.error('Fallback search also failed:', fallbackError);
      return [];
    }
  }
}

/**
 * Tool handler for search_knowledge_base
 */
export async function handleSearchKnowledgeBase(
  params: SearchKnowledgeBaseParams
): Promise<SearchKnowledgeBaseResult[]> {
  // Validate input
  if (!params.query || typeof params.query !== 'string' || !params.query.trim()) {
    throw new Error('Query parameter is required and must be a non-empty string');
  }
  
  if (!params.user_email || typeof params.user_email !== 'string') {
    throw new Error('user_email parameter is required');
  }
  
  const limit = params.limit && params.limit > 0 && params.limit <= 50 
    ? params.limit 
    : 10;
  
  // Map email to UID
  const userId = await getUserUidFromEmail(params.user_email);
  
  // Perform search
  return await searchKnowledgeBase(params.query.trim(), userId, limit);
}

