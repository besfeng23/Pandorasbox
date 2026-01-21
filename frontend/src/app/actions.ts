
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
import type { Memory } from '@/lib/types';

const { db } = initializeFirebase();

export async function createThread(agent: 'builder' | 'universe', userId: string) {
  if (!userId) {
    throw new Error('User is not authenticated.');
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
  if (!userId) {
    throw new Error('User is not authenticated.');
  }
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
  if (!userId) {
    throw new Error('User is not authenticated.');
  }
  
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
  if (threadId === new URL(process.env.NEXT_PUBLIC_URL || '').pathname.split('/').pop()) {
      redirect('/');
  }
}

export async function deleteMemoryAction(memoryId: string, userId: string) {
    if (!userId) {
        throw new Error('User is not authenticated.');
    }
    const memoryRef = doc(db, 'users', userId, 'memories', memoryId);
    const memoryDoc = await getDoc(memoryRef);
    if (!memoryDoc.exists() || memoryDoc.data().userId !== userId) {
        throw new Error('Permission denied or memory not found.');
    }

    await deleteDoc(memoryRef);
    revalidatePath('/memory');
}

export async function connectDataSource(
  userId: string,
  connectorId: string,
  metadata?: Record<string, any>
) {
  if (!userId) {
    throw new Error('User is not authenticated.');
  }

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
  if (!userId) {
    throw new Error('User is not authenticated.');
  }

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
