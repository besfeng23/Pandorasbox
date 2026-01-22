'use server';

import {
  collection,
  addDoc,
  serverTimestamp,
  query,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  orderBy,
  increment,
  arrayUnion,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { initializeFirebase } from '@/firebase';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Memory, SearchResult, Thread, Message, UserConnector } from '@/lib/types';

// Initialize firebase only if needed or guard it
const getDb = () => {
    const { db } = initializeFirebase();
    return db;
};

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:9002';

/**
 * SOVEREIGN AI STACK: Fetches memories directly from backend (Qdrant via semantic search).
 */
export async function fetchMemories(userId: string, agentId: string, queryText: string): Promise<SearchResult[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/memories?userId=${userId}&agentId=${agentId}&query=${encodeURIComponent(queryText)}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Failed to fetch memories from backend');
    return await response.json();
  } catch (error) {
    console.error('Error in fetchMemories action:', error);
    // Fallback or empty list
    return [];
  }
}

export async function deleteMemoryFromMemories(id: string, userId: string, agentId: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/memories/${id}?userId=${userId}&agentId=${agentId}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to delete memory from backend');
    revalidatePath('/memory');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateMemoryInMemories(id: string, newText: string, userId: string, agentId: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/memories/${id}?userId=${userId}&agentId=${agentId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: newText }),
    });
    if (!response.ok) throw new Error('Failed to update memory on backend');
    revalidatePath('/memory');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function createMemoryFromSettings(content: string, userId: string, agentId: string) {
  try {
    const response = await fetch(`${BACKEND_URL}/api/memories?userId=${userId}&agentId=${agentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    });
    if (!response.ok) throw new Error('Failed to create memory on backend');
    revalidatePath('/memory');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getRecentThreads(userId: string, agent?: string): Promise<Thread[]> {
  try {
    let url = `${BACKEND_URL}/api/threads?userId=${userId}`;
    if (agent) {
      url += `&agent=${agent}`;
    }
    const response = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Failed to fetch threads from backend');
    const data = await response.json();
    return data.threads || [];
  } catch (error) {
    console.error('Error in getRecentThreads action:', error);
    return [];
  }
}

export async function getThread(threadId: string, userId: string): Promise<Thread | null> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/threads/${threadId}?userId=${userId}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) return null;
    const data = await response.json();
    return data.thread;
  } catch (error) {
    console.error('Error in getThread action:', error);
    return null;
  }
}

export async function getMessages(threadId: string, userId: string): Promise<Message[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/threads/${threadId}/messages?userId=${userId}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Failed to fetch messages from backend');
    const data = await response.json();
    return data.messages || [];
  } catch (error) {
    console.error('Error in getMessages action:', error);
    return [];
  }
}

export async function getUserConnectors(userId: string): Promise<UserConnector[]> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/connectors?userId=${userId}`, {
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Failed to fetch connectors from backend');
    const data = await response.json();
    return data.connectors || [];
  } catch (error) {
    console.error('Error in getUserConnectors action:', error);
    return [];
  }
}

// --- Existing functions updated to use getDb() and handle nulls ---

export async function createThread(agent: 'builder' | 'universe', userId: string) {
  const db = getDb();
  if (!db || !userId) {
    throw new Error('Database or User not available.');
  }

  const now = new Date();
  const threadData = {
    userId,
    agent,
    name: 'New Thread',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    version: 1,
    history: [{
      action: 'create',
      userId,
      timestamp: now,
    }]
  };

  const newThreadRef = await addDoc(collection(db, 'threads'), threadData);
  
  revalidatePath('/');
  redirect(`/chat/${newThreadRef.id}`);
}

export async function renameThread(threadId: string, newName: string, userId: string) {
  const db = getDb();
  if (!db || !userId) throw new Error('Database or User not available.');
  
  const threadRef = doc(db, 'threads', threadId);
  const now = new Date();
  
  await updateDoc(threadRef, { 
    name: newName,
    version: increment(1),
    updatedAt: serverTimestamp(),
    history: arrayUnion({
      action: 'rename',
      userId,
      timestamp: now,
      changes: { name: newName }
    })
  });
  
  revalidatePath('/');
  revalidatePath(`/chat/${threadId}`);
}

export async function deleteThread(threadId: string, userId: string) {
  const db = getDb();
  if (!db || !userId) throw new Error('Database or User not available.');
  
  const threadRef = doc(db, 'threads', threadId);
  const threadDoc = await getDoc(threadRef);
  if (!threadDoc.exists() || threadDoc.data().userId !== userId) {
    throw new Error('Permission denied.');
  }

  const messagesQuery = query(collection(db, 'threads', threadId, 'messages'));
  const messagesSnapshot = await getDocs(messagesQuery);
  const deletePromises: Promise<void>[] = [];
  messagesSnapshot.forEach((doc) => {
    deletePromises.push(deleteDoc(doc.ref));
  });
  
  await Promise.all(deletePromises);
  await deleteDoc(threadRef);

  revalidatePath('/');
  revalidatePath(`/chat/${threadId}`);
  redirect('/');
}

export async function deleteMemoryAction(memoryId: string, userId: string) {
    const db = getDb();
    if (!db || !userId) throw new Error('Database or User not available.');
    
    const memoryRef = doc(db, 'users', userId, 'memories', memoryId);
    const memoryDoc = await getDoc(memoryRef);
    if (!memoryDoc.exists() || memoryDoc.data().userId !== userId) {
        throw new Error('Permission denied or memory not found.');
    }

    await deleteDoc(memoryRef);
    revalidatePath('/memory');
}

export async function deleteMessage(threadId: string, messageId: string, userId: string) {
    const db = getDb();
    if (!db || !userId) throw new Error('Database or User not available.');
    
    // Security check: Verify user owns the thread
    const threadRef = doc(db, 'threads', threadId);
    const threadDoc = await getDoc(threadRef);
    if (!threadDoc.exists() || threadDoc.data().userId !== userId) {
      throw new Error('Permission denied.');
    }

    const messageRef = doc(db, 'threads', threadId, 'messages', messageId);
    await deleteDoc(messageRef);
    
    revalidatePath(`/chat/${threadId}`);
}

export async function connectDataSource(
  userId: string,
  connectorId: string,
  metadata?: Record<string, any>
) {
  const db = getDb();
  if (!db || !userId) throw new Error('Database or User not available.');

  const connectorRef = doc(db, 'users', userId, 'connectors', connectorId);
  const existingDoc = await getDoc(connectorRef);

  const dataToSet: any = {
    userId,
    status: 'connected',
    updatedAt: serverTimestamp(),
  };

  if (metadata) {
    dataToSet.metadata = metadata;
  }

  if (!existingDoc.exists()) {
    dataToSet.createdAt = serverTimestamp();
  }

  await setDoc(connectorRef, dataToSet, { merge: true });
  revalidatePath('/connectors');
}

export async function disconnectDataSource(userId: string, connectorId: string) {
  const db = getDb();
  if (!db || !userId) throw new Error('Database or User not available.');

  const connectorRef = doc(db, 'users', userId, 'connectors', connectorId);
  
  if (!(await getDoc(connectorRef)).exists()) {
    return;
  }

  await updateDoc(connectorRef, {
    status: 'disconnected',
    updatedAt: serverTimestamp(),
  });

  revalidatePath('/connectors');
}
