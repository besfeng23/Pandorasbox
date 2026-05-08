import 'server-only';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import type { ChatMessage, ChatMessageMetadata, ChatToolUsage, Conversation } from '@/contracts/chat';

const MAX_CONTEXT_MESSAGES = 20;
const MAX_METADATA_STRING_LENGTH = 8_000;
const MAX_METADATA_ARRAY_ITEMS = 25;
const MAX_METADATA_OBJECT_KEYS = 50;
const MAX_METADATA_DEPTH = 6;
const TRUNCATED_SUFFIX = '\n…[truncated]';

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function truncateString(value: string, maxLength = MAX_METADATA_STRING_LENGTH) {
  return value.length > maxLength ? `${value.slice(0, maxLength)}${TRUNCATED_SUFFIX}` : value;
}

function sanitizeMetadataValue(value: unknown, depth = 0): unknown {
  if (value === null || typeof value === 'boolean' || typeof value === 'number') return value;
  if (typeof value === 'string') return truncateString(value);
  if (value === undefined || typeof value === 'function' || typeof value === 'symbol' || typeof value === 'bigint') return undefined;
  if (depth >= MAX_METADATA_DEPTH) return '[truncated: max depth]';

  if (Array.isArray(value)) {
    return value
      .slice(0, MAX_METADATA_ARRAY_ITEMS)
      .map((item) => sanitizeMetadataValue(item, depth + 1))
      .filter((item) => item !== undefined);
  }

  if (!isRecord(value)) return String(value);

  const sanitized: Record<string, unknown> = {};
  for (const [key, nestedValue] of Object.entries(value).slice(0, MAX_METADATA_OBJECT_KEYS)) {
    const sanitizedValue = sanitizeMetadataValue(nestedValue, depth + 1);
    if (sanitizedValue !== undefined) sanitized[key] = sanitizedValue;
  }
  return sanitized;
}

function normalizeToolUsage(value: unknown): ChatToolUsage | null {
  if (!isRecord(value)) return null;
  const rawName = value.toolName || value.name || value.tool || value.type;
  if (typeof rawName !== 'string' || !rawName.trim()) return null;

  const tool: ChatToolUsage = { toolName: truncateString(rawName.trim(), 256) };
  const input = sanitizeMetadataValue(value.input ?? value.args ?? value.arguments);
  const output = sanitizeMetadataValue(value.output ?? value.result ?? value.data);
  if (input !== undefined) tool.input = input;
  if (output !== undefined) tool.output = output;
  if (typeof value.citation === 'string' && value.citation.trim()) tool.citation = truncateString(value.citation.trim(), 2_000);
  return tool;
}

function normalizeMetadata(value: unknown): ChatMessageMetadata | undefined {
  if (!isRecord(value)) return undefined;

  const metadata: ChatMessageMetadata = {};
  if (typeof value.reasoning === 'string' && value.reasoning.trim()) metadata.reasoning = truncateString(value.reasoning);

  if (Array.isArray(value.toolUsages)) {
    const toolUsages = value.toolUsages.map(normalizeToolUsage).filter((tool): tool is ChatToolUsage => Boolean(tool));
    if (toolUsages.length > 0) metadata.toolUsages = toolUsages;
  }

  return metadata.reasoning || metadata.toolUsages?.length ? metadata : undefined;
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
    const metadata = normalizeMetadata(data.metadata ?? { reasoning: data.reasoning, toolUsages: data.toolUsages });
    const message: ChatMessage = {
      id: doc.id,
      role: data.role,
      content: data.content,
      createdAt: asMillis(data.createdAt),
    };
    if (metadata) message.metadata = metadata;
    return message;
  });
}

export async function appendMessage(uid: string, conversationId: string, message: { role: 'user' | 'assistant'; content: string; metadata?: ChatMessageMetadata; }) {
  const conversationRef = conversationsCollection(uid).doc(conversationId);
  const messageRef = messagesCollection(uid, conversationId).doc();
  const createdAt = FieldValue.serverTimestamp();
  const storedMessage: { role: 'user' | 'assistant'; content: string; createdAt: FieldValue; metadata?: ChatMessageMetadata } = {
    role: message.role,
    content: message.content,
    createdAt,
  };
  const metadata = normalizeMetadata(message.metadata);
  if (metadata) storedMessage.metadata = metadata;

  await messageRef.set(storedMessage);
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
