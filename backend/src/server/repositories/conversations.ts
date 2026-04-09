import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import type { ChatMessage, Conversation } from '@/contracts/chat';

const MAX_CONTEXT_MESSAGES = 20;

function conversationsCollection(uid: string) {
  return getFirestoreAdmin().collection(`users/${uid}/conversations`);
}

function messagesCollection(uid: string, conversationId: string) {
  return conversationsCollection(uid).doc(conversationId).collection('messages');
}

function asMillis(value: unknown): number {
  if (value instanceof Timestamp) return value.toMillis();
  return Date.now();
}

export async function listConversations(uid: string): Promise<Conversation[]> {
  const snapshot = await conversationsCollection(uid).orderBy('updatedAt', 'desc').limit(50).get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      name: String(data.name || 'New Chat'),
      agentId: (data.agentId || 'universe') as 'builder' | 'universe',
      workspaceId: (data.workspaceId as string | undefined) ?? null,
      createdAt: asMillis(data.createdAt),
      updatedAt: asMillis(data.updatedAt),
    };
  });
}

export async function createConversation(uid: string, input?: { name?: string; agentId?: 'builder' | 'universe'; workspaceId?: string | null; }) {
  const now = FieldValue.serverTimestamp();
  const ref = conversationsCollection(uid).doc();
  await ref.set({
    name: input?.name?.trim() || 'New Chat',
    agentId: input?.agentId || 'universe',
    workspaceId: input?.workspaceId ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return ref.id;
}

export async function getConversation(uid: string, conversationId: string): Promise<Conversation | null> {
  const doc = await conversationsCollection(uid).doc(conversationId).get();
  if (!doc.exists) return null;
  const data = doc.data()!;
  return {
    id: doc.id,
    name: String(data.name || 'New Chat'),
    agentId: (data.agentId || 'universe') as 'builder' | 'universe',
    workspaceId: (data.workspaceId as string | undefined) ?? null,
    createdAt: asMillis(data.createdAt),
    updatedAt: asMillis(data.updatedAt),
  };
}

export async function listMessages(uid: string, conversationId: string): Promise<ChatMessage[]> {
  const snapshot = await messagesCollection(uid, conversationId).orderBy('createdAt', 'asc').get();
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      role: data.role,
      content: data.content,
      createdAt: asMillis(data.createdAt),
    } as ChatMessage;
  });
}

export async function appendMessage(uid: string, conversationId: string, message: { role: 'user' | 'assistant'; content: string; }) {
  const conversationRef = conversationsCollection(uid).doc(conversationId);
  const messageRef = messagesCollection(uid, conversationId).doc();
  const createdAt = FieldValue.serverTimestamp();
  await messageRef.set({ role: message.role, content: message.content, createdAt });
  await conversationRef.set({ updatedAt: createdAt }, { merge: true });
  return messageRef.id;
}

export async function getRecentContext(uid: string, conversationId: string) {
  const snapshot = await messagesCollection(uid, conversationId)
    .orderBy('createdAt', 'desc')
    .limit(MAX_CONTEXT_MESSAGES)
    .get();

  return snapshot.docs
    .map((doc) => {
      const d = doc.data();
      return { role: d.role, content: d.content };
    })
    .reverse();
}

export async function renameConversation(uid: string, conversationId: string, name: string) {
  await conversationsCollection(uid).doc(conversationId).update({
    name: name.trim(),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deleteConversation(uid: string, conversationId: string) {
  const convRef = conversationsCollection(uid).doc(conversationId);
  while (true) {
    const msgs = await convRef.collection('messages').limit(500).get();
    if (msgs.empty) {
      break;
    }
    const batch = getFirestoreAdmin().batch();
    msgs.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
  }
  await convRef.delete();
}
