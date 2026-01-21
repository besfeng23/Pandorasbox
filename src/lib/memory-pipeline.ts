'use server';

import { preCheck, postCheck } from '@/server/guardrails';
import { indexMemory } from './vector-store';
import { saveMemoryItem } from './memory-store';
import type { AgentId } from './agent-types';

export interface IngestResult {
  success: boolean;
  blocked?: boolean;
  reason?: string;
  memoryId?: string;
}

export async function ingestMemory(
  content: string,
  uid: string,
  agentId: AgentId,
  source: string = 'conversation',
  metadata: Record<string, any> = {},
): Promise<IngestResult> {
  // Pre-check guardrails
  const preResult = preCheck(content, agentId);
  if (!preResult.allowed) {
    return {
      success: false,
      blocked: true,
      reason: preResult.reason,
    };
  }

  try {
    // Save to Firestore
    const firestoreId = await saveMemoryItem(uid, agentId, content, source, metadata);

    // Index in Qdrant
    await indexMemory({
      id: firestoreId,
      content,
      uid,
      agentId,
      source,
      metadata,
    });

    return {
      success: true,
      memoryId: firestoreId,
    };
  } catch (error) {
    console.error('Failed to ingest memory:', error);
    return {
      success: false,
      reason: 'Failed to save memory',
    };
  }
}

export async function ingestMemoriesBatch(
  items: { content: string; source?: string; metadata?: Record<string, any> }[],
  uid: string,
  agentId: AgentId,
): Promise<{ success: number; blocked: number; failed: number }> {
  let success = 0;
  let blocked = 0;
  let failed = 0;

  for (const item of items) {
    const result = await ingestMemory(
      item.content,
      uid,
      agentId,
      item.source || 'batch',
      item.metadata || {},
    );

    if (result.success) success++;
    else if (result.blocked) blocked++;
    else failed++;
  }

  return { success, blocked, failed };
}

export async function processConversationTurn(
  userMessage: string,
  assistantResponse: string,
  uid: string,
  agentId: AgentId,
  threadId: string,
): Promise<void> {
  const postResult = postCheck(assistantResponse, agentId);
  if (!postResult.allowed) {
    return;
  }

  // Create concise episodic memory from the turn
  const summary = `User asked: "${userMessage.substring(0, 100)}..." → Response: "${assistantResponse.substring(0, 100)}..."`;

  await ingestMemory(summary, uid, agentId, 'conversation', {
    threadId,
    type: 'conversation_turn',
  });
}
