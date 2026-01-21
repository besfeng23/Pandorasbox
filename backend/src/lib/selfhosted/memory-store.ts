import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import type { Message, Thread } from '@/lib/types';

export interface MemoryMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  userId: string;
  threadId?: string;
  createdAt?: FieldValue | Date;
  embedding?: number[];
  source?: string;
  agentId?: string;
}

export async function getThread(threadId: string): Promise<Thread | null> {
  const firestoreAdmin = getFirestoreAdmin();
  const threadDoc = await firestoreAdmin.collection('threads').doc(threadId).get();
  if (!threadDoc.exists) {
    return null;
  }
  const data = threadDoc.data();
  return {
    id: threadDoc.id,
    userId: data?.userId,
    title: data?.title || 'New Chat',
    createdAt: data?.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
    agent: data?.agent, // Assuming 'agent' field exists on thread
  } as Thread;
}

export async function getRecentMessages(threadId: string, limit: number = 10): Promise<MemoryMessage[]> {
  const firestoreAdmin = getFirestoreAdmin();
  const messagesSnapshot = await firestoreAdmin.collection('history')
    .where('threadId', '==', threadId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return messagesSnapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      role: data.role,
      content: data.content,
      userId: data.userId,
      threadId: data.threadId,
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : undefined,
      embedding: data.embedding || undefined,
    } as MemoryMessage;
  }).reverse(); // Return in chronological order
}

export async function addMessage(threadId: string, message: Omit<MemoryMessage, 'id' | 'createdAt'>): Promise<string> {
  const firestoreAdmin = getFirestoreAdmin();
  const messageRef = firestoreAdmin.collection('threads').doc(threadId).collection('messages').doc();
  await messageRef.set({
    ...message,
    createdAt: FieldValue.serverTimestamp(),
    id: messageRef.id,
  });
  return messageRef.id;
}

export async function writeMemory(memory: Omit<MemoryMessage, 'createdAt'> & {embedding: number[]}): Promise<string> {
  const firestoreAdmin = getFirestoreAdmin();
  const memoryRef = firestoreAdmin.collection('memories').doc();
  await memoryRef.set({
    ...memory,
    createdAt: FieldValue.serverTimestamp(),
    id: memoryRef.id,
  });
  return memoryRef.id;
}
