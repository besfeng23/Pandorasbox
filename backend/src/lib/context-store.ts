/**
 * Phase 3: Context Store
 * 
 * Manages persistent context state per user/session with importance weighting
 */

import { getFirestoreAdmin } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface ContextMemory {
  memoryId: string;
  importance: number; // 0.0 to 1.0, decays over time
  lastAccessed: Date;
  accessCount: number;
}

export interface ContextSession {
  userId: string;
  sessionId: string;
  activeMemories: ContextMemory[];
  createdAt: Date;
  lastAccessed: Date;
}

/**
 * Gets or creates a context session for a user
 */
export async function getContextSession(
  userId: string,
  sessionId?: string
): Promise<ContextSession> {
  const firestoreAdmin = getFirestoreAdmin();
  const sessionDocId = sessionId || `default_${userId}`;

  const sessionRef = firestoreAdmin
    .collection('context_store')
    .doc(sessionDocId);

  const doc = await sessionRef.get();

  if (doc.exists) {
    const data = doc.data()!;
    return {
      userId: data.userId,
      sessionId: data.sessionId || sessionDocId,
      activeMemories: (data.activeMemories || []).map((m: any) => ({
        ...m,
        lastAccessed: m.lastAccessed?.toDate?.() || new Date(m.lastAccessed),
      })),
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      lastAccessed: data.lastAccessed?.toDate?.() || new Date(data.lastAccessed),
    };
  }

  // Create new session
  const newSession: Omit<ContextSession, 'sessionId'> & { sessionId?: string } = {
    userId,
    sessionId: sessionDocId,
    activeMemories: [],
    createdAt: new Date(),
    lastAccessed: new Date(),
  };

  await sessionRef.set({
    ...newSession,
    createdAt: FieldValue.serverTimestamp(),
    lastAccessed: FieldValue.serverTimestamp(),
  });

  return {
    ...newSession,
    sessionId: sessionDocId,
  } as ContextSession;
}

/**
 * Updates context session with accessed memories
 */
export async function updateContextSession(
  userId: string,
  memoryIds: string[],
  sessionId?: string
): Promise<void> {
  const session = await getContextSession(userId, sessionId);
  const firestoreAdmin = getFirestoreAdmin();
  const sessionRef = firestoreAdmin
    .collection('context_store')
    .doc(session.sessionId);

  const existingMemoryMap = new Map<string, ContextMemory>();
  session.activeMemories.forEach(m => existingMemoryMap.set(m.memoryId, m));

  // Update or add memories
  for (const memoryId of memoryIds) {
    const existing = existingMemoryMap.get(memoryId);
    if (existing) {
      // Boost importance and update access
      existing.importance = Math.min(1.0, existing.importance * 1.1);
      existing.accessCount += 1;
      existing.lastAccessed = new Date();
    } else {
      // New memory with initial importance
      existingMemoryMap.set(memoryId, {
        memoryId,
        importance: 0.8, // Start with high importance for new context
        lastAccessed: new Date(),
        accessCount: 1,
      });
    }
  }

  await sessionRef.update({
    activeMemories: Array.from(existingMemoryMap.values()),
    lastAccessed: FieldValue.serverTimestamp(),
  });
}

/**
 * Gets context importance for a memory
 */
export async function getMemoryImportance(
  userId: string,
  memoryId: string,
  sessionId?: string
): Promise<number> {
  const session = await getContextSession(userId, sessionId);
  const memory = session.activeMemories.find(m => m.memoryId === memoryId);
  return memory?.importance ?? 0.5; // Default importance if not in context
}

/**
 * Cleans up old sessions (older than 30 days)
 */
export async function cleanupOldSessions(): Promise<number> {
  const firestoreAdmin = getFirestoreAdmin();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const snapshot = await firestoreAdmin
    .collection('context_store')
    .where('lastAccessed', '<', Timestamp.fromDate(thirtyDaysAgo))
    .get();

  const batch = firestoreAdmin.batch();
  let count = 0;

  snapshot.docs.forEach(doc => {
    batch.delete(doc.ref);
    count++;
  });

  if (count > 0) {
    await batch.commit();
  }

  return count;
}

