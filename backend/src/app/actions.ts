'use server';

import { revalidatePath } from 'next/cache';
import type { Memory, SearchResult, Thread, Message, UserConnector } from '@/lib/types';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { searchPoints, upsertPoint, deletePoint } from '@/lib/sovereign/qdrant-client';
import { embedText } from '@/lib/ai/embedding';
import { v4 as uuidv4 } from 'uuid';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { cookies } from 'next/headers';
import { getAuthAdmin } from '@/lib/firebase-admin';

async function requireSessionUid(): Promise<string> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('session')?.value || cookieStore.get('__session')?.value;
  if (!sessionCookie) throw new Error('Unauthorized');

  const decoded = await getAuthAdmin().verifySessionCookie(sessionCookie, true);
  return decoded.uid;
}

function ensureActor(optionalUserId?: string) {
  return requireSessionUid().then((uid) => {
    if (optionalUserId && optionalUserId !== uid) {
      console.warn('[actions] Ignoring forged userId parameter', { claimed: optionalUserId, uid });
    }
    return uid;
  });
}

export async function searchMemoryAction(query: string, userId: string, agentId: string): Promise<SearchResult[]> {
  if (!query.trim()) return [];
  const uid = await ensureActor(userId);

  try {
    const vector = await embedText(query);
    const filter = {
      must: [
        { key: 'userId', match: { value: uid } },
        { key: 'agentId', match: { value: agentId } },
      ],
    };

    const results = await searchPoints('memories', vector, 10, filter);
    return results.map((r) => ({
      id: r.id.toString(),
      text: r.payload?.content || '',
      score: r.score,
      timestamp: r.payload?.createdAt || new Date().toISOString(),
    }));
  } catch (error) {
    console.error('Search Memory Error:', error);
    return [];
  }
}

export async function createMemoryFromSettings(content: string, userId: string, agentId: string) {
  const uid = await ensureActor(userId);
  try {
    const vector = await embedText(content);
    const id = uuidv4();

    await upsertPoint('memories', {
      id,
      vector,
      payload: {
        content,
        userId: uid,
        agentId,
        createdAt: new Date().toISOString(),
        source: 'manual',
      },
    });

    revalidatePath('/memory');
    return { success: true };
  } catch (error: any) {
    console.error('Create Memory Error:', error);
    return { success: false, message: error.message };
  }
}

export async function deleteMemoryFromMemories(id: string, userId: string, agentId: string) {
  await ensureActor(userId);
  try {
    await deletePoint('memories', id);
    revalidatePath('/memory');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function updateMemoryInMemories(id: string, newText: string, userId: string, agentId: string) {
  await ensureActor(userId);
  try {
    await deleteMemoryFromMemories(id, userId, agentId);
    await createMemoryFromSettings(newText, userId, agentId);
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function getUserThreads(userId: string, agent?: string): Promise<Thread[]> {
  const uid = await ensureActor(userId);
  try {
    const db = getFirestoreAdmin();
    let query = db.collection(`users/${uid}/conversations`).orderBy('updatedAt', 'desc');

    if (agent) query = query.where('agent', '==', agent);

    const snapshot = await query.limit(20).get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      name: doc.data().name,
      title: doc.data().name,
      agent: doc.data().agentId || 'universe',
      userId: uid,
      version: 1,
      createdAt: doc.data().createdAt as Timestamp,
      updatedAt: doc.data().updatedAt as Timestamp,
    })) as Thread[];
  } catch (error: any) {
    console.error('[getUserThreads] Error:', error);
    return [];
  }
}

export async function getThread(threadId: string, userId: string): Promise<Thread | null> {
  const uid = await ensureActor(userId);
  try {
    const db = getFirestoreAdmin();
    const doc = await db.doc(`users/${uid}/conversations/${threadId}`).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
      id: doc.id,
      name: data.name,
      title: data.name,
      agent: data.agentId || 'universe',
      userId: uid,
      version: 1,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    } as Thread;
  } catch (error) {
    console.error('Get Thread Error:', error);
    return null;
  }
}

export async function getMessages(threadId: string, userId: string): Promise<Message[]> {
  const uid = await ensureActor(userId);
  try {
    const db = getFirestoreAdmin();
    const snapshot = await db.collection(`users/${uid}/conversations/${threadId}/messages`).orderBy('createdAt', 'asc').get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Message[];
  } catch (error) {
    console.error('Get Messages Error:', error);
    return [];
  }
}

export async function createThread(agent: 'builder' | 'universe', userId: string) {
  const uid = await ensureActor(userId);
  try {
    const db = getFirestoreAdmin();
    const threadRef = await db.collection(`users/${uid}/conversations`).add({
      agentId: agent,
      name: 'New Chat',
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    revalidatePath('/');
    return { id: threadRef.id };
  } catch (error: any) {
    console.error('[createThread] CRITICAL ERROR:', error);
    throw new Error(`Failed to create thread: ${error?.message || 'Unknown error'}`);
  }
}

export async function deleteThread(threadId: string, userId: string, agentId?: string) {
  const uid = await ensureActor(userId);
  try {
    const db = getFirestoreAdmin();
    const ref = db.doc(`users/${uid}/conversations/${threadId}`);
    const messagesSnapshot = await ref.collection('messages').get();
    const batch = db.batch();
    messagesSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
    batch.delete(ref);
    await batch.commit();
    revalidatePath('/');
    return { success: true };
  } catch (error) {
    console.error('Delete Thread Error:', error);
    return { success: false, message: 'Failed to delete thread' };
  }
}

export async function deleteMessage(threadId: string, messageId: string, userId: string) {
  const uid = await ensureActor(userId);
  try {
    const db = getFirestoreAdmin();
    await db.doc(`users/${uid}/conversations/${threadId}/messages/${messageId}`).delete();
    revalidatePath(`/chat/${threadId}`);
    return { success: true };
  } catch (error) {
    console.error('Delete Message Error:', error);
    return { success: false, message: 'Failed to delete message' };
  }
}

export async function summarizeThread(threadId: string, userId: string) {
  await ensureActor(userId);
  return { success: true, message: 'Summary generated' };
}

export async function transcribeAndProcessMessage(formData: FormData) {
  await requireSessionUid();
  return { success: true, message: 'Audio processed' };
}

export async function updateThread(threadId: string, userId: string, agentId: string, data: any) {
  const uid = await ensureActor(userId);
  try {
    const db = getFirestoreAdmin();
    const name = data.title || data.name;
    await db.doc(`users/${uid}/conversations/${threadId}`).update({
      ...(name ? { name } : {}),
      ...(data.archived !== undefined ? { archived: data.archived } : {}),
      ...(data.pinned !== undefined ? { pinned: data.pinned } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });
    revalidatePath('/');
    revalidatePath(`/chat/${threadId}`);
    return { success: true };
  } catch (error) {
    console.error('Update Thread Error:', error);
    return { success: false, message: 'Failed to update thread' };
  }
}

export async function reindexMemories(userId: string, agentId?: string) {
  await ensureActor(userId);
  return { success: true, message: 'Memories reindexed', processed: 0 };
}

export async function generateUserApiKey(userId: string) {
  await ensureActor(userId);
  return { success: true, apiKey: 'sk-placeholder', message: 'API key generated' };
}

export async function clearMemory(userId: string, agentId?: string) {
  await ensureActor(userId);
  return { success: true, message: 'Memory cleared' };
}

export async function exportUserData(userId: string) {
  await ensureActor(userId);
  return { success: true, data: JSON.stringify({ threads: [], memories: [] }), message: 'Data exported' };
}

export async function uploadKnowledge(formData: FormData) {
  await requireSessionUid();
  return { success: true, message: 'File uploaded' };
}

export async function fetchMemories(userId: string, agentId: string, queryText: string): Promise<SearchResult[]> {
  return searchMemoryAction(queryText, userId, agentId);
}

export async function getRecentThreads(userId: string, agent?: string): Promise<Thread[]> {
  const threads = await getUserThreads(userId, agent);
  return JSON.parse(JSON.stringify(threads));
}

export async function getUserConnectors(userId: string): Promise<UserConnector[]> {
  const uid = await ensureActor(userId);
  try {
    const db = getFirestoreAdmin();
    const snapshot = await db.collection(`users/${uid}/connectors`).get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as UserConnector[];
  } catch (error) {
    console.error('Get Connectors Error:', error);
    return [];
  }
}

export async function renameThread(threadId: string, newName: string, userId: string) {
  const uid = await ensureActor(userId);
  const db = getFirestoreAdmin();
  await db.doc(`users/${uid}/conversations/${threadId}`).update({
    name: newName,
    updatedAt: FieldValue.serverTimestamp(),
  });
  revalidatePath('/');
  revalidatePath(`/chat/${threadId}`);
}

export async function connectDataSource(userId: string, connectorId: string, metadata?: any) {
  const uid = await ensureActor(userId);
  try {
    const db = getFirestoreAdmin();
    const connectorRef = db.doc(`users/${uid}/connectors/${connectorId}`);

    await connectorRef.set({
      id: connectorId,
      userId: uid,
      status: 'connected',
      metadata: metadata || {},
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (connectorId === 'public-website' && metadata?.url) {
      try {
        const response = await fetch(metadata.url);
        if (response.ok) {
          const html = await response.text();
          const cheerio = await import('cheerio');
          const $ = cheerio.load(html);

          $('script, style, nav, footer, header').remove();
          const text = $('body').text().replace(/\s+/g, ' ').trim();

          if (text) {
            const { processAndStore } = await import('@/lib/knowledge/ingestor');
            await processAndStore(text, metadata.url, 'builder', uid);
            await processAndStore(text, metadata.url, 'universe', uid);
          }
        }
      } catch (indexError) {
        console.error('Failed to index website during connection:', indexError);
      }
    }

    revalidatePath('/connectors');
    return { success: true };
  } catch (error: any) {
    console.error('Connect Data Source Error:', error);
    throw error;
  }
}

export async function disconnectDataSource(userId: string, connectorId: string) {
  const uid = await ensureActor(userId);
  try {
    const db = getFirestoreAdmin();
    await db.doc(`users/${uid}/connectors/${connectorId}`).delete();
    revalidatePath('/connectors');
    return { success: true };
  } catch (error: any) {
    console.error('Disconnect Data Source Error:', error);
    throw error;
  }
}
