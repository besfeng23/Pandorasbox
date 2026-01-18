'use server';

import { getFirestoreAdmin } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import type { AgentId } from './agent-types';

// Path helpers for agent-scoped data
function getAgentBasePath(uid: string, agentId: AgentId): string {
  return `users/${uid}/agents/${agentId}`;
}

// Thread operations
export async function createThread(uid: string, agentId: AgentId, title?: string): Promise<string> {
  const firestore = getFirestoreAdmin();
  const threadRef = firestore.collection(`${getAgentBasePath(uid, agentId)}/threads`).doc();

  await threadRef.set({
    id: threadRef.id,
    uid,
    agentId,
    title: title || 'New Chat',
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return threadRef.id;
}

export async function getThreads(uid: string, agentId: AgentId, limit: number = 50) {
  const firestore = getFirestoreAdmin();
  const snapshot = await firestore
    .collection(`${getAgentBasePath(uid, agentId)}/threads`)
    .orderBy('updatedAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate?.()?.toISOString() || new Date().toISOString(),
    updatedAt: (doc.data().updatedAt as Timestamp)?.toDate?.()?.toISOString() || new Date().toISOString(),
  }));
}

// Message operations
export async function addMessage(
  uid: string,
  agentId: AgentId,
  threadId: string,
  role: 'user' | 'assistant',
  content: string,
): Promise<string> {
  const firestore = getFirestoreAdmin();
  const messageRef = firestore
    .collection(`${getAgentBasePath(uid, agentId)}/threads/${threadId}/messages`)
    .doc();

  await messageRef.set({
    id: messageRef.id,
    uid,
    agentId,
    threadId,
    role,
    content,
    createdAt: FieldValue.serverTimestamp(),
  });

  // Update thread timestamp
  await firestore.doc(`${getAgentBasePath(uid, agentId)}/threads/${threadId}`).update({
    updatedAt: FieldValue.serverTimestamp(),
  });

  return messageRef.id;
}

export async function getRecentMessages(
  uid: string,
  agentId: AgentId,
  threadId: string,
  limit: number = 20,
) {
  const firestore = getFirestoreAdmin();
  const snapshot = await firestore
    .collection(`${getAgentBasePath(uid, agentId)}/threads/${threadId}/messages`)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.reverse().map(doc => ({
    id: doc.id,
    ...doc.data(),
    createdAt: (doc.data().createdAt as Timestamp)?.toDate?.()?.toISOString() || new Date().toISOString(),
  }));
}

// Memory items (long-term)
export async function saveMemoryItem(
  uid: string,
  agentId: AgentId,
  content: string,
  source: string = 'conversation',
  metadata: Record<string, any> = {},
): Promise<string> {
  const firestore = getFirestoreAdmin();

  // Create deterministic ID for idempotency
  const deterministicId = Buffer.from(`${uid}:${agentId}:${content.substring(0, 100)}`)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 20);

  const memoryRef = firestore.doc(`${getAgentBasePath(uid, agentId)}/memoryItems/${deterministicId}`);

  await memoryRef.set(
    {
      id: deterministicId,
      uid,
      agentId,
      content,
      source,
      ...metadata,
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  );

  return deterministicId;
}

export async function getMemoryItems(uid: string, agentId: AgentId, limit: number = 100) {
  const firestore = getFirestoreAdmin();
  const snapshot = await firestore
    .collection(`${getAgentBasePath(uid, agentId)}/memoryItems`)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

// Canon (persistent story/world facts)
export async function saveCanonItem(
  uid: string,
  agentId: AgentId,
  key: string,
  value: string,
): Promise<void> {
  const firestore = getFirestoreAdmin();
  await firestore.doc(`${getAgentBasePath(uid, agentId)}/canon/${key}`).set({
    key,
    value,
    uid,
    agentId,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getCanon(uid: string, agentId: AgentId): Promise<Record<string, string>> {
  const firestore = getFirestoreAdmin();
  const snapshot = await firestore.collection(`${getAgentBasePath(uid, agentId)}/canon`).get();

  const canon: Record<string, string> = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    canon[data.key] = data.value;
  });
  return canon;
}

// Preferences
export async function savePreference(uid: string, agentId: AgentId, key: string, value: any): Promise<void> {
  const firestore = getFirestoreAdmin();
  await firestore.doc(`${getAgentBasePath(uid, agentId)}/preferences/${key}`).set({
    key,
    value,
    uid,
    agentId,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getPreferences(uid: string, agentId: AgentId): Promise<Record<string, any>> {
  const firestore = getFirestoreAdmin();
  const snapshot = await firestore.collection(`${getAgentBasePath(uid, agentId)}/preferences`).get();

  const prefs: Record<string, any> = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data();
    prefs[data.key] = data.value;
  });
  return prefs;
}

// World state (for Universe agent)
export async function saveWorldState(
  uid: string,
  agentId: AgentId,
  state: Record<string, any>,
): Promise<void> {
  const firestore = getFirestoreAdmin();
  await firestore.doc(`${getAgentBasePath(uid, agentId)}/worldState/current`).set({
    ...state,
    uid,
    agentId,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function getWorldState(
  uid: string,
  agentId: AgentId,
): Promise<Record<string, any> | null> {
  const firestore = getFirestoreAdmin();
  const doc = await firestore.doc(`${getAgentBasePath(uid, agentId)}/worldState/current`).get();

  if (!doc.exists) return null;
  return doc.data() as Record<string, any>;
}
