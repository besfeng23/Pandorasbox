/**
 * Phase 4: Agentic Reasoning & Flow Orchestration
 * 
 * Agent Memory - Manages agent session state and persistence
 */

import { getFirestoreAdmin } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { AgentType, AgentContext, AgentHandoff } from './agent-graph';

/**
 * Agent session stored in Firestore
 */
export interface AgentSession {
  id: string;
  userId: string;
  sessionId: string;
  goal: string;
  agents: Array<{
    type: AgentType;
    status: 'idle' | 'active' | 'complete' | 'error';
    result?: unknown;
    error?: string;
    completedAt?: Date;
  }>;
  contextMemories: string[]; // Memory IDs used in this session
  handoffs: AgentHandoff[];
  status: 'active' | 'complete' | 'error';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

const AGENT_SESSIONS_COLLECTION = 'agent_sessions';

/**
 * Create a new agent session
 */
export async function createAgentSession(
  userId: string,
  goal: string,
  contextMemoryIds: string[] = []
): Promise<AgentSession> {
  const firestoreAdmin = getFirestoreAdmin();
  const sessionId = `agent_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  
  const session: Omit<AgentSession, 'id'> & { id?: string } = {
    userId,
    sessionId,
    goal,
    agents: [],
    contextMemories: contextMemoryIds,
    handoffs: [],
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const docRef = await firestoreAdmin
    .collection(AGENT_SESSIONS_COLLECTION)
    .add({
      ...session,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

  return {
    ...session,
    id: docRef.id,
  } as AgentSession;
}

/**
 * Update agent session
 */
export async function updateAgentSession(
  sessionId: string,
  updates: Partial<AgentSession>
): Promise<void> {
  const firestoreAdmin = getFirestoreAdmin();
  const sessionRef = firestoreAdmin
    .collection(AGENT_SESSIONS_COLLECTION)
    .doc(sessionId);

  await sessionRef.update({
    ...updates,
    updatedAt: FieldValue.serverTimestamp(),
    ...(updates.status === 'complete' || updates.status === 'error'
      ? { completedAt: FieldValue.serverTimestamp() }
      : {}),
  });
}

/**
 * Record agent execution in session
 */
export async function recordAgentExecution(
  sessionId: string,
  agentType: AgentType,
  result?: unknown,
  error?: string
): Promise<void> {
  const firestoreAdmin = getFirestoreAdmin();
  const sessionRef = firestoreAdmin
    .collection(AGENT_SESSIONS_COLLECTION)
    .doc(sessionId);

  const sessionDoc = await sessionRef.get();
  if (!sessionDoc.exists) {
    throw new Error(`Agent session ${sessionId} not found`);
  }

  const sessionData = sessionDoc.data() as AgentSession;
  const agents = sessionData.agents || [];
  
  // Update or add agent entry
  const agentIndex = agents.findIndex(a => a.type === agentType);
  const agentEntry = {
    type: agentType,
    status: error ? 'error' : 'complete',
    result,
    error,
    completedAt: new Date(),
  };

  if (agentIndex >= 0) {
    agents[agentIndex] = agentEntry;
  } else {
    agents.push(agentEntry);
  }

  await sessionRef.update({
    agents,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Record agent handoff
 */
export async function recordAgentHandoff(
  sessionId: string,
  handoff: AgentHandoff
): Promise<void> {
  const firestoreAdmin = getFirestoreAdmin();
  const sessionRef = firestoreAdmin
    .collection(AGENT_SESSIONS_COLLECTION)
    .doc(sessionId);

  const sessionDoc = await sessionRef.get();
  if (!sessionDoc.exists) {
    throw new Error(`Agent session ${sessionId} not found`);
  }

  const sessionData = sessionDoc.data() as AgentSession;
  const handoffs = sessionData.handoffs || [];
  handoffs.push(handoff);

  await sessionRef.update({
    handoffs,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

/**
 * Get agent session by ID
 */
export async function getAgentSession(
  sessionId: string
): Promise<AgentSession | null> {
  const firestoreAdmin = getFirestoreAdmin();
  const doc = await firestoreAdmin
    .collection(AGENT_SESSIONS_COLLECTION)
    .doc(sessionId)
    .get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    ...data,
    createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
    updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
    completedAt: data.completedAt?.toDate?.() || undefined,
    handoffs: (data.handoffs || []).map((h: any) => ({
      ...h,
      timestamp: h.timestamp?.toDate?.() || new Date(h.timestamp),
    })),
  } as AgentSession;
}

/**
 * Get agent sessions for a user
 */
export async function getUserAgentSessions(
  userId: string,
  limit: number = 10
): Promise<AgentSession[]> {
  const firestoreAdmin = getFirestoreAdmin();
  const snapshot = await firestoreAdmin
    .collection(AGENT_SESSIONS_COLLECTION)
    .where('userId', '==', userId)
    .orderBy('createdAt', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data.createdAt?.toDate?.() || new Date(data.createdAt),
      updatedAt: data.updatedAt?.toDate?.() || new Date(data.updatedAt),
      completedAt: data.completedAt?.toDate?.() || undefined,
      handoffs: (data.handoffs || []).map((h: any) => ({
        ...h,
        timestamp: h.timestamp?.toDate?.() || new Date(h.timestamp),
      })),
    } as AgentSession;
  });
}

