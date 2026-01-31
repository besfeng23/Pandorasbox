'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import type { Memory, SearchResult, Thread, Message, UserConnector } from '@/lib/types';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { searchPoints, upsertPoint, deletePoint, scrollPoints, type QdrantSearchResult } from '@/lib/sovereign/qdrant-client';
import { embedText } from '@/lib/ai/embedding';
import { v4 as uuidv4 } from 'uuid';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { transcribeAudio } from '@/lib/ai/whisper';
import { completeInference } from '@/lib/sovereign/inference';
import { processAndStore } from '@/lib/knowledge/ingestor';
import pdf from 'pdf-parse';

// --- BACKEND LOGIC (Direct DB/AI Access) ---
// This comment is added to force a new build.

export async function searchMemoryAction(query: string, userId: string, agentId: string, workspaceId?: string): Promise<SearchResult[]> {
    if (!query.trim()) return [];

    try {
        const vector = await embedText(query);

        // Filter by userId and agentId to ensure privacy and context
        const filter: any = {
            must: [
                { key: 'userId', match: { value: userId } },
                { key: 'agentId', match: { value: agentId } }
            ]
        };

        if (workspaceId) {
            filter.must.push({ key: 'workspaceId', match: { value: workspaceId } });
        }

        const results = await searchPoints('memories', vector, 10, filter);

        return (results || []).map(r => ({
            id: r.id.toString(),
            text: r.payload?.content || '',
            score: r.score,
            timestamp: r.payload?.createdAt || new Date().toISOString(),
            payload: r.payload // Include full payload for frontend filtering
        }));
    } catch (error) {
        console.error('Search Memory Error:', error);
        return [];
    }
}

export async function createMemoryFromSettings(content: string, userId: string, agentId: string) {
    try {
        const vector = await embedText(content);
        const id = uuidv4();

        await upsertPoint('memories', {
            id,
            vector,
            payload: {
                content,
                userId,
                agentId,
                createdAt: new Date().toISOString(),
                source: 'manual'
            }
        });

        revalidatePath('/memory');
        return { success: true };
    } catch (error: any) {
        console.error('Create Memory Error:', error);
        return { success: false, message: error.message };
    }
}

export async function deleteMemoryFromMemories(id: string, userId: string, agentId: string) {
    try {
        await deletePoint('memories', id);
        revalidatePath('/memory');
        return { success: true };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function updateMemoryInMemories(id: string, newText: string, userId: string, agentId: string) {
    try {
        await deleteMemoryFromMemories(id, userId, agentId);
        await createMemoryFromSettings(newText, userId, agentId);
        return { success: true };
    } catch (error: any) {
    }
}

export async function promoteMemory(id: string, userId: string, agentId: string) {
    try {
        const { getPoint } = await import('@/lib/sovereign/qdrant-client');
        const point = await getPoint('memories', id);

        if (!point || !point.payload) {
            return { success: false, message: "Memory not found" };
        }

        // Verify ownership (optional but good practice)
        if (point.payload.userId !== userId) {
            return { success: false, message: "Unauthorized access to memory" };
        }

        const content = point.payload.content || '';
        if (!content) {
            return { success: false, message: "Memory content is empty" };
        }

        // Promote to 'rule' type
        return await updateMemoryType(id, 'rule', content, userId, agentId);
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

// Better yet, let's export a generic updateMemoryMetadata if possible, or just accept that the frontend will call updateMemory with new type
export async function updateMemoryType(id: string, newType: string, content: string, userId: string, agentId: string) {
    try {
        const vector = await embedText(content);
        // Overwrite with new type
        await upsertPoint('memories', {
            id,
            vector,
            payload: {
                content,
                userId,
                agentId,
                createdAt: new Date().toISOString(),
                source: 'manual',
                type: newType
            }
        });
        revalidatePath('/memory');
        return { success: true };
    } catch (e: any) {
        return { success: false, message: e.message };
    }
}


// Helper to serialize Firestore data
function serializeData(data: any): any {
    if (!data) return data;
    const serialized = { ...data };
    if (serialized.createdAt && typeof serialized.createdAt.toDate === 'function') {
        serialized.createdAt = serialized.createdAt.toDate(); // Convert to Date which Next.js handles
    }
    if (serialized.updatedAt && typeof serialized.updatedAt.toDate === 'function') {
        serialized.updatedAt = serialized.updatedAt.toDate();
    }
    return serialized;
}

export async function getUserThreads(userId: string, agent?: string, workspaceId?: string): Promise<Thread[]> {
    try {
        if (!userId || typeof userId !== 'string') {
            console.error('[getUserThreads] Invalid userId:', userId);
            return [];
        }

        const db = getFirestoreAdmin();
        let query = db.collection(`users/${userId}/threads`).orderBy('updatedAt', 'desc');

        if (agent) {
            query = query.where('agent', '==', agent);
        }

        if (workspaceId) {
            query = query.where('workspaceId', '==', workspaceId);
        } else {
            query = query.where('workspaceId', '==', null);
        }

        const snapshot = await query.limit(20).get();
        return (snapshot?.docs || []).map(doc => ({
            id: doc.id,
            ...serializeData(doc.data())
        })) as Thread[];
    } catch (error: any) {
        console.error('[getUserThreads] Error:', error);
        return [];
    }
}

export async function getThread(threadId: string, userId: string): Promise<Thread | null> {
    try {
        const db = getFirestoreAdmin();
        const doc = await db.doc(`users/${userId}/threads/${threadId}`).get();
        if (!doc.exists) return null;
        return { id: doc.id, ...serializeData(doc.data()) } as Thread;
    } catch (error) {
        console.error('Get Thread Error:', error);
        return null;
    }
}

export async function getMessages(threadId: string, userId: string): Promise<Message[]> {
    try {
        const db = getFirestoreAdmin();
        const thread = await getThread(threadId, userId);
        if (!thread) return [];
        const agentId = thread.agent;

        const historyRef = db.collection(`users/${userId}/agents/${agentId}/history`);
        const snapshot = await historyRef
            .where('threadId', '==', threadId)
            .orderBy('createdAt', 'asc')
            .get();

        return (snapshot?.docs || []).map(doc => ({
            id: doc.id,
            ...serializeData(doc.data())
        })) as Message[];
    } catch (error) {
        console.error('Get Messages Error:', error);
        return [];
    }
}

export async function createThread(agent: 'builder' | 'universe', userId: string, workspaceId?: string) {
    try {
        if (!userId || typeof userId !== 'string') {
            console.error('[createThread] Invalid userId:', userId);
            throw new Error('User ID is required to create a thread');
        }

        console.log('[createThread] Attempting to get Firestore Admin...');
        const db = getFirestoreAdmin();
        console.log('[createThread] Firestore Admin obtained successfully');

        // 1. Get current user - Assuming userId is already passed from the frontend
        // For actual auth, replace with Firebase Admin SDK's auth().verifyIdToken(...) or similar
        const actualUserId = userId;

        // 2. Create the thread WITHOUT AI generation first (Safe Mode)
        console.log('[createThread] Creating thread for user:', actualUserId, 'agent:', agent);
        const threadRef = await db.collection(`users/${actualUserId}/threads`).add({
            userId: actualUserId,
            agent,
            workspaceId: workspaceId || null,
            name: "New Thread", // Don't use AI to generate this yet
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            messages: [] // Initialize with an empty messages array
        });

        console.log('[createThread] Thread created successfully:', threadRef.id);
        revalidatePath('/');
        return { id: threadRef.id };
    } catch (error: any) {
        console.error("[createThread] CRITICAL ERROR:", error);
        console.error("[createThread] Error stack:", error?.stack);
        console.error("[createThread] Error code:", error?.code);
        console.error("[createThread] Error message:", error?.message);
        console.error("[createThread] Error name:", error?.name);

        // Provide more specific error messages
        if (error?.message?.includes('Firebase Admin app not initialized')) {
            const errorMsg = 'Firebase Admin is not initialized. Please check your Firebase configuration.';
            console.error('[createThread]', errorMsg);
            throw new Error(errorMsg);
        }
        if (error?.code === 'permission-denied' || error?.message?.includes('permission')) {
            const errorMsg = 'Permission denied. Please check your Firestore security rules.';
            console.error('[createThread]', errorMsg);
            throw new Error(errorMsg);
        }
        if (error?.code === 'unavailable' || error?.message?.includes('unavailable')) {
            const errorMsg = 'Firestore is currently unavailable. Please try again later.';
            console.error('[createThread]', errorMsg);
            throw new Error(errorMsg);
        }

        const errorMsg = `Failed to create thread: ${error?.message || 'Unknown error'}`;
        console.error('[createThread]', errorMsg);
        throw new Error(errorMsg);
    }
}

export async function deleteThread(threadId: string, userId: string, agentId?: string) {
    try {
        const db = getFirestoreAdmin();
        await db.doc(`users/${userId}/threads/${threadId}`).delete();
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Delete Thread Error:', error);
        return { success: false, message: 'Failed to delete thread' };
    }
}

export async function deleteMessage(threadId: string, messageId: string, userId: string) {
    try {
        const thread = await getThread(threadId, userId);
        if (!thread) return { success: false, message: 'Thread not found' };
        const db = getFirestoreAdmin();
        const historyRef = db.collection(`users/${userId}/agents/${thread.agent}/history`);
        await historyRef.doc(messageId).delete();
        revalidatePath(`/chat/${threadId}`);
        return { success: true };
    } catch (error) {
        console.error('Delete Message Error:', error);
        return { success: false, message: 'Failed to delete message' };
    }
}

// --- MISSING STUBS TO FIX BUILD ERRORS ---

export async function summarizeThread(threadId: string, userId: string) {
    try {
        const messages = await getMessages(threadId, userId);
        if (messages.length === 0) return { success: false, message: 'No messages to summarize' };

        const summaryPrompt = [
            { role: 'system' as const, content: 'You are a master of synthesis. Provide a 3-word title/summary for the following conversation.' },
            { role: 'user' as const, content: messages.map(m => `${m.role}: ${m.content}`).join('\n') }
        ];

        const summary = await completeInference(summaryPrompt);
        await updateThread(threadId, userId, (await getThread(threadId, userId))?.agent || 'universe', { name: summary });

        return { success: true, message: 'Summary generated', summary };
    } catch (error: any) {
        console.error('Summarize Thread Error:', error);
        return { success: false, message: error.message };
    }
}

export async function transcribeAndProcessMessage(formData: FormData) {
    try {
        const file = formData.get('audio_file') as File;
        if (!file) throw new Error('No audio file provided');

        const text = await transcribeAudio(file);
        return { success: true, text };
    } catch (error: any) {
        console.error('Voice Processing Error:', error);
        return { success: false, message: error.message };
    }
}

export async function updateThread(threadId: string, userId: string, agentId: string, data: any) {
    try {
        const db = getFirestoreAdmin();
        await db.doc(`users/${userId}/threads/${threadId}`).update({
            ...data,
            updatedAt: FieldValue.serverTimestamp()
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
    try {
        const filter: any = { must: [{ key: 'userId', match: { value: userId } }] };
        if (agentId) filter.must.push({ key: 'agentId', match: { value: agentId } });

        const points = await scrollPoints('memories', 100, filter);
        for (const point of points) {
            if (point.payload?.content) {
                const vector = await embedText(point.payload.content);
                await upsertPoint('memories', {
                    id: point.id,
                    vector,
                    payload: point.payload
                });
            }
        }
        return { success: true, message: 'Memories reindexed', processed: points.length };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function generateUserApiKey(userId: string) {
    return { success: true, apiKey: `sk-box-${uuidv4()}`, message: 'API key generated' };
}

export async function clearMemory(userId: string, agentId?: string) {
    try {
        const filter: any = { must: [{ key: 'userId', match: { value: userId } }] };
        if (agentId) filter.must.push({ key: 'agentId', match: { value: agentId } });

        const points = await scrollPoints('memories', 100, filter);
        for (const point of points) {
            await deletePoint('memories', String(point.id));
        }
        return { success: true, message: 'Memory cleared' };
    } catch (error: any) {
        return { success: false, message: error.message };
    }
}

export async function exportUserData(userId: string) {
    const db = getFirestoreAdmin();
    const threads = await getUserThreads(userId);
    const filter = { must: [{ key: 'userId', match: { value: userId } }] };
    const points = await scrollPoints('memories', 100, filter);

    return { success: true, data: JSON.stringify({ threads, memories: points }), message: 'Data exported' };
}

export async function uploadKnowledge(formData: FormData) {
    try {
        const userId = formData.get('userId') as string;
        const agentId = formData.get('agentId') as string || 'universe';
        const file = formData.get('file') as File;

        if (!file || !userId) throw new Error('Missing file or userId');

        let text = '';
        if (file.type === 'application/pdf') {
            const buffer = Buffer.from(await file.arrayBuffer());
            const data = await pdf(buffer);
            text = data.text;
        } else {
            text = await file.text();
        }

        if (!text.trim()) throw new Error('File content is empty');

        const result = await processAndStore(text, file.name, agentId, userId);
        return { success: true, message: `Successfully ingested ${result.chunks} chunks from ${file.name}` };
    } catch (error: any) {
        console.error('Upload Knowledge Error:', error);
        return { success: false, message: error.message };
    }
}

// --- FRONTEND COMPATIBILITY WRAPPERS ---

export async function fetchMemories(userId: string, agentId: string, queryText: string, workspaceId?: string): Promise<SearchResult[]> {
    return searchMemoryAction(queryText, userId, agentId, workspaceId);
}

export async function getRecentThreads(userId: string, agent?: string, workspaceId?: string): Promise<Thread[]> {
    const threads = await getUserThreads(userId, agent, workspaceId);
    return JSON.parse(JSON.stringify(threads));
}

export async function getUserConnectors(userId: string): Promise<UserConnector[]> {
    try {
        const db = getFirestoreAdmin();
        const snapshot = await db.collection(`users/${userId}/connectors`).get();
        return (snapshot?.docs || []).map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as UserConnector[];
    } catch (error) {
        console.error('Get Connectors Error:', error);
        return [];
    }
}

export async function renameThread(threadId: string, newName: string, userId: string) {
    const db = getFirestoreAdmin();
    await db.doc(`users/${userId}/threads/${threadId}`).update({
        name: newName,
        updatedAt: FieldValue.serverTimestamp()
    });
    revalidatePath('/');
    revalidatePath(`/chat/${threadId}`);
}

export async function connectDataSource(userId: string, connectorId: string, metadata?: any) {
    try {
        const db = getFirestoreAdmin();
        const connectorRef = db.doc(`users/${userId}/connectors/${connectorId}`);

        await connectorRef.set({
            id: connectorId,
            userId,
            status: 'connected',
            metadata: metadata || {},
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        // Trigger indexing for public website if URL is provided
        if (connectorId === 'public-website' && metadata?.url) {
            try {
                const response = await fetch(metadata.url);
                if (response.ok) {
                    const html = await response.text();
                    const cheerio = await import('cheerio');
                    const $ = cheerio.load(html);

                    // Basic cleanup
                    $('script, style, nav, footer, header').remove();
                    const text = $('body').text().replace(/\s+/g, ' ').trim();

                    if (text) {
                        const { processAndStore } = await import('@/lib/knowledge/ingestor');
                        // Index for both main agents
                        await processAndStore(text, metadata.url, 'builder', userId);
                        await processAndStore(text, metadata.url, 'universe', userId);
                    }
                }
            } catch (indexError) {
                console.error('Failed to index website during connection:', indexError);
                // We still consider the connector "connected" but log the error
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
    try {
        const db = getFirestoreAdmin();
        await db.doc(`users/${userId}/connectors/${connectorId}`).delete();
        revalidatePath('/connectors');
        return { success: true };
    } catch (error: any) {
        console.error('Disconnect Data Source Error:', error);
        throw error;
    }
}
export async function getKnowledgeGraph(userId: string, agentId: string) {
    try {
        const filter = {
            must: [
                { key: 'userId', match: { value: userId } },
                { key: 'agentId', match: { value: agentId } }
            ]
        };

        const points = await scrollPoints('memories', 30, filter);

        const nodes = points.map((p: QdrantSearchResult) => ({
            id: String(p.id),
            label: (p.payload?.content || '').substring(0, 30) + '...',
            type: p.payload?.type || 'memory'
        }));

        const edges: any[] = [];
        // Create some edges based on proximity in the list (simple heuristic for now)
        for (let i = 0; i < nodes.length - 1; i++) {
            if (i % 3 === 0) {
                edges.push({
                    id: `edge-${i}`,
                    sourceId: nodes[i].id,
                    targetId: nodes[i + 1].id,
                    relation: 'related',
                    weight: 0.5
                });
            }
        }

        return { nodes, edges };
    } catch (error) {
        console.error('Get Knowledge Graph Error:', error);
        return { nodes: [], edges: [] };
    }
}

export async function getSystemHealth() {
    const health: any = {
        qdrant: { status: 'offline', latency: 0 },
        inference: { status: 'offline', latency: 0 },
        firebase: { status: 'offline' },
        timestamp: new Date().toISOString(),
    };

    // 1. Check Qdrant
    try {
        const start = Date.now();
        const { QDRANT_URL } = await import('@/lib/sovereign/config');
        const response = await fetch(`${QDRANT_URL}/collections`, { signal: AbortSignal.timeout(2000) });
        if (response.ok) {
            health.qdrant.status = 'online';
            health.qdrant.latency = Date.now() - start;
        }
    } catch (e) {
        console.error('Health Check: Qdrant unreachable');
    }

    // 2. Check Inference
    try {
        const start = Date.now();
        const { INFERENCE_URL } = await import('@/lib/sovereign/config');
        // Using a simple GET to the base URL (might need to adjust depending on vLLM/Ollama)
        const response = await fetch(INFERENCE_URL.replace('/v1', '/'), { signal: AbortSignal.timeout(2000) });
        if (response.ok || response.status === 404) { // 404 might just mean the base path is empty but server is up
            health.inference.status = 'online';
            health.inference.latency = Date.now() - start;
        }
    } catch (e) {
        console.error('Health Check: Inference unreachable');
    }

    // 3. Check Firebase
    try {
        const db = getFirestoreAdmin();
        if (db) {
            health.firebase.status = 'online';
        }
    } catch (e) {
        console.error('Health Check: Firebase Admin Failed');
    }

    return health;
}

export async function completeOnboarding(userId: string) {
    try {
        const db = getFirestoreAdmin();
        await db.doc(`users/${userId}`).set({
            hasCompletedOnboarding: true,
            updatedAt: FieldValue.serverTimestamp()
        }, { merge: true });
        return { success: true };
    } catch (error) {
        console.error('Complete Onboarding Error:', error);
        return { success: false };
    }
}

export async function checkOnboardingStatus(userId: string) {
    try {
        const db = getFirestoreAdmin();
        const doc = await db.doc(`users/${userId}`).get();
        if (!doc.exists) return false;
        return doc.data()?.hasCompletedOnboarding || false;
    } catch (error) {
        return false;
    }
}
