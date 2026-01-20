
'use server';

import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { getStorage, getDownloadURL } from 'firebase-admin/storage';
import { FieldValue } from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { checkRateLimit } from '@/lib/rate-limit';
import { trackEvent } from '@/lib/analytics';
import { SearchResult, Thread } from '@/lib/types';
import pdfParse from 'pdf-parse'; // Assuming pdf-parse is installed
import { chunkText } from '@/lib/utils'; // Assuming chunkText utility exists here or similar location

// Self-hosted imports
import { applyGuardrails } from '@/lib/selfhosted/guardrails';
import { getThread, addMessage, getRecentMessages, writeMemory, MemoryMessage } from '@/lib/selfhosted/memory-store';
import { buildPrompt } from '@/lib/selfhosted/prompt-builder';
import { processInteraction } from '@/lib/selfhosted/memory-pipeline';
import { deriveAgentId } from '@/lib/selfhosted/agent-router';
import { getEmbedding, getEmbeddingsBatch } from '@/lib/selfhosted/embeddings-client';
import { embedText } from '@/lib/ai/embedding'; // New import for embedding
import { chatCompletion, ChatMessage } from '@/lib/sovereign/vllm-client';
import { searchPoints, upsertPoint } from '@/lib/sovereign/qdrant-client';


// Lazy initialization to avoid build-time errors

export async function createThread(userId: string, agentId: string): Promise<string> {
    const firestoreAdmin = getFirestoreAdmin();
    const threadRef = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/threads`).doc();
    await threadRef.set({
        id: threadRef.id,
        userId: userId,
        title: 'New Chat',
        createdAt: FieldValue.serverTimestamp(),
        agentId: agentId, // Store agentId with the thread
    });
    return threadRef.id;
}

export async function getUserThreads(userId: string, agentId: string) {
  try {
    if (!userId) return [];
    const firestoreAdmin = getFirestoreAdmin();
    // 1. Try to find threads (Safely)
    const threadsRef = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/threads`);
    
    // 2. Wrap the query in a try/catch to handle "Missing Index" or "Empty Collection"
    try {
      const snapshot = await threadsRef
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc') 
        .get();

      if (snapshot.empty) {
        return [];
      }

      // MAP & SERIALIZE: Convert Firestore Docs to Plain JSON
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          title: data.title || 'New Chat',
          // CRITICAL FIX: Convert Firestore Timestamp to a plain String
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString(),
          agent: data.agentId, // Ensure agent is returned
        } as Thread;
      });

    } catch (queryError) {
      console.warn("Could not fetch threads (likely missing index or collection). Returning empty list.");
      Sentry.captureException(queryError, { tags: { function: 'getUserThreads', errorType: 'queryError' } });
      return []; // <--- SAFETY VALVE: Return empty list instead of crashing
    }

  } catch (error) {
    console.error("Fatal error in getUserThreads:", error);
    Sentry.captureException(error, { tags: { function: 'getUserThreads', errorType: 'fatal' } });
    return []; // <--- DOUBLE SAFETY: Ensure the UI never crashes
  }
}

export async function transcribeAndProcessMessage(formData: FormData) {
    return { success: false, message: 'Audio transcription is not supported in this self-hosted configuration.' };
}


export async function submitUserMessage(formData: FormData): Promise<{ ok: boolean; threadId?: string; messageId?: string; code?: string; error?: string }> {
    const messageContent = formData.get('message') as string;
    const idToken = formData.get('idToken') as string;
    let threadId = formData.get('threadId') as string | null;
    const imageBase64 = formData.get('image_data') as string | null;
    const source = formData.get('source') as string || 'text';
    const agentId = formData.get('agentId') as string || 'builder'; // Get agentId from form data, default to 'builder'
  
    if (!idToken) {
      return { ok: false, code: 'UNAUTH', error: 'User not authenticated' };
    }

    let userId: string;
    try {
        const decodedToken = await getAuthAdmin().verifyIdToken(idToken);
        userId = decodedToken.uid;
    } catch (error: any) {
        return { ok: false, code: 'UNAUTH', error: error.message || 'Unauthorized' };
    }

    const guardrailResult = applyGuardrails(messageContent);
    if (guardrailResult.blocked) {
      return { ok: false, code: guardrailResult.code || 'BLOCKED', error: guardrailResult.message || 'Message blocked by guardrails.' };
    }

    const rateLimitCheck = await checkRateLimit(userId, 'messages');
    if (!rateLimitCheck.success) {
      return { ok: false, code: 'RATE_LIMIT', error: rateLimitCheck.message || 'Rate limit exceeded. Please try again later.'};
    }
  
    if ((!messageContent || !messageContent.trim()) && !imageBase64) {
      return { ok: false, code: 'BAD_REQUEST', error: 'Message content or image is missing.' };
    }
    
    const firestoreAdmin = getFirestoreAdmin();
    if (!threadId) {
        threadId = await createThread(userId, agentId); // Pass agentId to createThread
        const newTitle = messageContent.substring(0, 40) + (messageContent.length > 40 ? '...' : '');
        await firestoreAdmin.collection(`users/${userId}/agents/${agentId}/threads`).doc(threadId).update({ title: newTitle }); // Update thread path
    } else {
        const threadDoc = await firestoreAdmin.collection(`users/${userId}/agents/${agentId}/threads`).doc(threadId).get(); // Update thread path
        if (!threadDoc.exists || threadDoc.data()?.userId !== userId) {
            return { ok: false, code: 'UNAUTH', error: 'Thread not found or unauthorized' };
        }
    }
  
    const historyCollection = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/history`); // Update history path
    let userMessageId: string;
  
    try {
          const embedding = await embedText(messageContent || 'image'); // Use embedText
  
      const userMessageData = {
        role: 'user',
        content: messageContent,
        createdAt: FieldValue.serverTimestamp(),
        userId: userId,
        threadId: threadId,
        imageUrl: null,
        source: source,
        embedding: embedding,
      };

      const userMessageRef = await historyCollection.add(userMessageData);
      userMessageId = userMessageRef.id;
      await userMessageRef.update({ id: userMessageId });
  
      // Track analytics
      await trackEvent(userId, 'message_sent', { threadId, hasImage: !!imageBase64 });
      await trackEvent(userId, 'embedding_generated');
  
      console.log(`Successfully wrote message to thread ${threadId} for user: ${userId}`);
  
      let imageUrl: string | undefined = undefined;
      if (imageBase64) {
          const storage = getStorage();
          const bucket = storage.bucket(); 
          const imageBuffer = Buffer.from(imageBase64.split(',')[1], 'base64');
          const imagePath = `uploads/${userId}/${userMessageId}.jpeg`;
          const file = bucket.file(imagePath);
          
          await file.save(imageBuffer, {
              metadata: {
                  contentType: 'image/jpeg'
              }
          });
          imageUrl = await getDownloadURL(file);
          await userMessageRef.update({ imageUrl: imageUrl });
      }
  
      // --- SELF-HOSTED AI LANE START ---
      try {
        // 1. Derive Agent
        const threadDoc = await getThread(threadId);
        const agentId = deriveAgentId(threadDoc?.agent);

        // 2. Retrieve Context (Recent messages + RAG)
        const recentMessages = await getRecentMessages(threadId); // Fetches from Firestore
        // Also map to self-hosted message format
        const mappedRecentMessages = recentMessages.map(m => ({
            id: m.id || 'unknown',
            createdAt: (m.createdAt instanceof Date ? m.createdAt : new Date()) as Date,
            role: m.role as 'user'|'assistant',
            content: m.content
        }));
        
        const queryEmbedding = await embedText(messageContent);
        // Map agentId to collection name, e.g. "memories_builder" or "memories_universe" (or just one collection with filter)
        // For simplicity, we'll use a single collection "pandora_memories" and filter by payload if needed, 
        // OR use separate collections. The plan says "agent-specific collection (e.g., memories_builder)".
        const collectionName = `memories_${agentId}`;
        
        // Search Qdrant
        const qdrantResults = await searchPoints(collectionName, queryEmbedding, 5);
        const memories = qdrantResults.map(res => ({
            id: res.id,
            text: res.payload?.content || '',
            score: res.score,
            source: res.payload?.source
        }));

        // 3. Build Prompt
        const promptMessages = buildPrompt(agentId, mappedRecentMessages, memories);
        
        // Map to VLLM format
        const vllmMessages: ChatMessage[] = promptMessages.map(m => ({
            role: m.role as 'user'|'assistant'|'system',
            content: m.content
        }));

import { extractArtifacts } from '@/lib/sovereign/artifact-parser'; // Import artifact parser

// ...

        // 4. Inference
        const assistantContent = await chatCompletion(vllmMessages);

        // --- ARTIFACT EXTRACTION START ---
        try {
            const artifacts = extractArtifacts(assistantContent);
            if (artifacts.length > 0) {
                const artifactsRef = firestoreAdmin.collection(`users/${userId}/artifacts`); // Could be agent-scoped too if needed
                const batch = firestoreAdmin.batch();
                
                artifacts.forEach(artifact => {
                    const docRef = artifactsRef.doc();
                    batch.set(docRef, {
                        ...artifact,
                        userId,
                        agentId, // Tag with agentId
                        threadId,
                        createdAt: FieldValue.serverTimestamp(),
                        source: 'chat_generation'
                    });
                });
                await batch.commit();
                console.log(`[Artifacts] Extracted and saved ${artifacts.length} artifacts.`);
            }
        } catch (artifactError) {
            console.error('[Artifacts] Failed to extract/save artifacts:', artifactError);
        }
        // --- ARTIFACT EXTRACTION END ---

        // 5. Write Response
        await addMessage(threadId, { 
            role: 'assistant', 
            content: assistantContent, 
            userId 
        });
        
        // Also write to 'history' collection for backward compatibility/ChatPanel
        const assistantMessageData = {
            role: 'assistant',
            content: assistantContent,
            createdAt: FieldValue.serverTimestamp(),
            userId: userId,
            threadId: threadId,
            agentId: agentId, // Include agentId
            source: 'ai',
        };
        const assistantRef = await firestoreAdmin.collection(`users/${userId}/agents/${agentId}/history`).add(assistantMessageData); // Update history path
        await assistantRef.update({ id: assistantRef.id });

        // 6. Memory Pipeline
        await processInteraction(messageContent, assistantContent, userId, agentId);

      } catch (aiError: any) {
        console.error('Self-hosted AI failed:', aiError);
        return { ok: false, code: 'AI_ERROR', error: aiError.message || 'AI inference failed.' };
      }
      // --- SELF-HOSTED AI LANE END ---
      
  
      return { ok: true, messageId: userMessageId, threadId: threadId };


    } catch (error: any) {
        console.error('Firestore Write Failed in submitUserMessage:', error);
        Sentry.captureException(error, { tags: { function: 'submitUserMessage', userId } });
        return { ok: false, code: 'FIRESTORE_WRITE_ERROR', error: error.message || 'Failed to send message.' };
    }
}

export async function summarizeThread(threadId: string, userId: string): Promise<void> {
    console.warn('Thread summarization is not implemented in this self-hosted configuration.');
    return;
}

export async function searchMemoryAction(query: string, userId: string, agentId: string): Promise<SearchResult[]> {
    if (!query.trim() || !userId) {
        return [];
    }

    // Search both history and memories collections
    const firestoreAdmin = getFirestoreAdmin();
    const historyCollection = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/history`);
    // Search history in Firestore for relevant messages
    const historySnapshot = await historyCollection
        .where('userId', '==', userId)
        .where('content', '>=', query)
        .where('content', '<=', query + '\uf8ff')
        .limit(10)
        .get();
    const historyResults = historySnapshot.docs.map(doc => ({
        id: doc.id,
        text: doc.data().content,
        score: 1, // Assign a default score
        timestamp: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : new Date(),
    }));

    const queryEmbedding = await embedText(query);
    const collectionName = `memories_${agentId}`;
    const qdrantResults = await searchPoints(collectionName, queryEmbedding, 10);
    const memoryResults = qdrantResults.map(res => ({
        id: String(res.id),
        text: res.payload?.content || '',
        score: res.score,
        timestamp: new Date().toISOString(), // Qdrant might not have timestamp in top-level, assume 'now' or check payload
        type: 'memory'
    }));

    // Combine results and sort by score (highest first)
    const allResults = [
        ...historyResults.map(r => ({
            id: r.id,
            text: r.text,
            score: r.score,
            timestamp: (r.timestamp ? new Date(r.timestamp) : new Date()).toISOString(),
            source: 'history' as const
        })),
        ...memoryResults.map(r => ({
            id: r.id,
            text: r.text,
            score: r.score,
            timestamp: (r.timestamp ? new Date(r.timestamp) : new Date()).toISOString(),
            source: 'memory' as const
        }))
    ]
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .slice(0, 20); // Limit to top 20 results

    return allResults.map((r: SearchResult) => ({
        id: r.id,
        text: r.text,
        score: r.score,
        timestamp: r.timestamp
    }));
}

export async function updateSettings(formData: FormData) {
    const settingsData = {
        active_model: formData.get('active_model'),
        reply_style: formData.get('reply_style'),
        system_prompt_override: formData.get('system_prompt_override'),
    };
    const userId = formData.get('userId') as string;

    if (!userId) {
      return { success: false, message: 'User not authenticated.' };
    }
    const firestoreAdmin = getFirestoreAdmin();
    try {
        await firestoreAdmin.collection('settings').doc(userId).set(settingsData, { merge: true });
        revalidatePath('/settings');
        return { success: true, message: 'Settings updated successfully.' };
    } catch (error) {
        console.error('Error updating settings:', error);
        Sentry.captureException(error, { tags: { function: 'updateSettings', userId } });
        return { success: false, message: 'Failed to update settings.' };
    }
}

export async function clearMemory(userId: string, agentId: string) {
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }
    const firestoreAdmin = getFirestoreAdmin();
    const historyQuery = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/history`).where('userId', '==', userId);
    const memoriesQuery = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/memories`).where('userId', '==', userId);
    const stateCollectionRef = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/state`);
    const artifactsQuery = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/artifacts`).where('userId', '==', userId);

    try {
        const historySnapshot = await historyQuery.get();
        const historyBatch = firestoreAdmin.batch();
        historySnapshot.docs.forEach(doc => {
            historyBatch.delete(doc.ref);
        });
        await historyBatch.commit();

        const memoriesSnapshot = await memoriesQuery.get();
        const memoriesBatch = firestoreAdmin.batch();
        memoriesSnapshot.docs.forEach(doc => {
            memoriesBatch.delete(doc.ref);
        });
        await memoriesBatch.commit();
        
        const artifactsSnapshot = await artifactsQuery.get();
        const artifactsBatch = firestoreAdmin.batch();
        artifactsSnapshot.docs.forEach(doc => {
            artifactsBatch.delete(doc.ref);
        });
        await artifactsBatch.commit();

        const stateSnapshot = await stateCollectionRef.get();
        const stateBatch = firestoreAdmin.batch();
        stateSnapshot.docs.forEach(doc => {
            stateBatch.delete(doc.ref);
        });
        await stateBatch.commit();

        // Also delete threads
        const threadsSnapshot = await firestoreAdmin.collection(`users/${userId}/agents/${agentId}/threads`).where('userId', '==', userId).get();
        const threadsBatch = firestoreAdmin.batch();
        threadsSnapshot.docs.forEach(doc => {
            threadsBatch.delete(doc.ref);
        });
        await threadsBatch.commit();

        revalidatePath('/settings');
        return { success: true, message: 'Memory cleared successfully.' };
    } catch (error) {
        console.error('Error clearing memory:', error);
        Sentry.captureException(error, { tags: { function: 'clearMemory', userId } });
        return { success: false, message: 'Failed to clear memory.' };
    }
}

export async function getMemories(userId: string, agentId: string, query?: string) {
    'use server';
    try {
      if (!userId) {
        console.warn('getMemories: User not authenticated');
        return [];
      }
    
      const firestoreAdmin = getFirestoreAdmin();
      const historyCollection = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/history`);
    
      if (query && query.trim()) {
        // Direct search in history collection for relevant messages based on content
        const snapshot = await historyCollection
          .where('userId', '==', userId)
          .where('content', '>=', query)
          .where('content', '<=', query + '\uf8ff')
          .orderBy('content') // orderBy is required for range queries
          .limit(10)
          .get();
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      } else {
        try {
          const snapshot = await historyCollection
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (queryError: any) {
          // If orderBy fails (missing index), try without it
          if (queryError.code === 9 || queryError.message?.includes('index')) {
            console.warn('Firestore index missing for createdAt. Querying without orderBy.');
            const snapshot = await historyCollection
              .where('userId', '==', userId)
              .limit(50)
              .get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          }
          throw queryError;
        }
      }
    } catch (error: any) {
      console.error('Error fetching memories:', error);
      // Return empty array instead of throwing to prevent server component crash
      return [];
    }
}
  
export async function deleteMemory(id: string, userId: string, agentId: string) {
    'use server';
    if (!userId) {
      return { success: false, message: 'User not authenticated.' };
    }
    const firestoreAdmin = getFirestoreAdmin();
    try {
      const docRef = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/history`).doc(id);
      // Add a check to ensure user owns the document before deleting
      const docSnap = await docRef.get();
      if (!docSnap.exists || docSnap.data()?.userId !== userId) {
        return { success: false, message: 'Permission denied.' };
      }
      await docRef.delete();
      revalidatePath('/settings');
      return { success: true };
    } catch (error) {
      console.error('Error deleting memory:', error);
      Sentry.captureException(error, { tags: { function: 'deleteMemory', userId, memoryId: id } });
      return { success: false, message: 'Failed to delete memory.' };
    }
}
  
export async function updateMemory(id: string, newText: string, userId: string, agentId: string) {
    'use server';
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }
    const firestoreAdmin = getFirestoreAdmin();
    try {
        const docRef = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/history`).doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists || docSnap.data()?.userId !== userId) {
            return { success: false, message: 'Permission denied.' };
        }
            const newEmbedding = await getEmbedding(newText);
        await docRef.update({
            content: newText,
            embedding: newEmbedding,
            editedAt: FieldValue.serverTimestamp(),
        });
        revalidatePath('/settings');
        return { success: true };
    } catch (error) {
        console.error('Error updating memory:', error);
        Sentry.captureException(error, { tags: { function: 'updateMemory', userId, memoryId: id } });
        return { success: false, message: 'Failed to update memory.' };
    }
}

export async function createMemoryFromSettings(content: string, userId: string, agentId: string): Promise<{ success: boolean; message?: string; memory_id?: string }> {
    'use server';
    if (!userId || !content || !content.trim()) {
        return { success: false, message: 'User not authenticated or content is empty.' };
    }
    
    // Use centralized memory utility to ensure automatic indexing
    const firestoreAdmin = getFirestoreAdmin();
    try {
        const embedding = await embedText(content.trim()); // Use embedText
        const memoryId = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/memories`).doc().id; // Update memories path

        await writeMemory({
            id: memoryId,
            userId: userId,
            role: 'user',
            content: content.trim(),
            source: 'settings',
            embedding: embedding,
        });

        const collectionName = `memories_${agentId}`;
        await upsertPoint(collectionName, {
            id: memoryId, // Ensure ID is compatible (UUID string is fine for Qdrant)
            vector: embedding,
            payload: {
                content: content.trim(),
                userId,
                agentId,
                source: 'settings',
                createdAt: new Date().toISOString()
            }
        });

        revalidatePath('/settings');
        return { success: true, memory_id: memoryId };
    } catch (error) {
        console.error('Error creating memory:', error);
        Sentry.captureException(error, { tags: { function: 'createMemoryFromSettings', userId } });
        return { success: false, message: 'Failed to create memory.' };
    }
}

export async function deleteMemoryFromMemories(id: string, userId: string, agentId: string): Promise<{ success: boolean; message?: string }> {
    'use server';
    if (!userId) {
      return { success: false, message: 'User not authenticated.' };
    }
    const firestoreAdmin = getFirestoreAdmin();
    try {
      const docRef = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/memories`).doc(id);
      const docSnap = await docRef.get();
      if (!docSnap.exists || docSnap.data()?.userId !== userId) {
        return { success: false, message: 'Permission denied.' };
      }
      await docRef.delete();
      revalidatePath('/');
      return { success: true };
    } catch (error) {
      console.error('Error deleting memory:', error);
      Sentry.captureException(error, { tags: { function: 'deleteMemoryFromMemories', userId, memoryId: id } });
      return { success: false, message: 'Failed to delete memory.' };
    }
}

export async function updateMemoryInMemories(id: string, newText: string, userId: string, agentId: string): Promise<{ success: boolean; message?: string }> {
    'use server';
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }
    
    // Use centralized memory utility to ensure embedding is regenerated
    const firestoreAdmin = getFirestoreAdmin();

    try {
        const docRef = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/memories`).doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists || docSnap.data()?.userId !== userId) {
            return { success: false, message: 'Permission denied.' };
        }
        const newEmbedding = await getEmbedding(newText);
        await docRef.update({
            content: newText,
            embedding: newEmbedding,
            editedAt: FieldValue.serverTimestamp(),
        });

        // Update in Qdrant as well
        const collectionName = `memories_${agentId}`;
        await upsertPoint(collectionName, {
            id,
            vector: newEmbedding,
            payload: {
                content: newText,
                userId,
                agentId,
                source: 'updated_memory',
                updatedAt: new Date().toISOString()
            }
        });

        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error updating memory:', error);
        Sentry.captureException(error, { tags: { function: 'updateMemoryInMemories', userId, memoryId: id } });
        return { success: false, message: 'Failed to update memory.' };
    }
}

export async function uploadKnowledge(formData: FormData): Promise<{ success: boolean; message: string; chunks?: number }> {
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;
    const agentId = formData.get('agentId') as string || 'universe'; // Get agentId from form data, default to 'universe'

    if (!file || !userId) {
        return { success: false, message: 'File or user ID missing.' };
    }

    // Check rate limit for uploads
    const rateLimitCheck = await checkRateLimit(userId, 'uploads');
    if (!rateLimitCheck.success) {
        return { 
            success: false, 
            message: rateLimitCheck.message || 'Upload rate limit exceeded. Please try again later.' 
        };
    }

    const firestoreAdmin = getFirestoreAdmin();
    try {
        let rawContent = '';
        const fileBuffer = Buffer.from(await file.arrayBuffer());

        if (file.type === 'application/pdf') {
            const data = await pdfParse(fileBuffer);
            rawContent = data.text;
        } else if (file.type.startsWith('text/')) {
            rawContent = fileBuffer.toString('utf-8');
        } else {
            return { success: false, message: `Unsupported file type: ${file.type}` };
        }

        const chunks = chunkText(rawContent);
        // const historyCollection = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/history`); // Removed, not directly needed here

        const embeddings = await getEmbeddingsBatch(chunks); // Assuming getEmbeddingsBatch now uses embedText
        
        // const agentId = 'universe'; // Now passed in as argument

        const batch = firestoreAdmin.batch();
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = embeddings[i];
            const memoryId = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/memories`).doc().id; // Update memories path
            
            // Write to Firestore memories collection
            batch.set(firestoreAdmin.collection(`users/${userId}/agents/${agentId}/memories`).doc(memoryId), { // Update memories path
                id: memoryId,
                userId: userId,
                role: 'assistant', // Or 'document_chunk'
                content: chunk,
                embedding: embedding,
                source: 'knowledge_upload',
                metadata: {
                    source_filename: file.name,
                    chunk_index: i,
                },
                createdAt: FieldValue.serverTimestamp(),
            });

            // Upsert to Qdrant
            const collectionName = `memories_${agentId}`;
            await upsertPoint(collectionName, {
                id: memoryId,
                vector: embedding,
                payload: {
                    content: chunk,
                    userId,
                    agentId,
                    source: 'knowledge_upload',
                    source_filename: file.name,
                    chunk_index: i,
                    createdAt: new Date().toISOString()
                }
            });
        }
        // Commit batch after all chunks are processed
        await batch.commit();
        
        // Track analytics
        await trackEvent(userId, 'knowledge_uploaded', { fileName: file.name, chunks: chunks.length });

        revalidatePath('/settings');

        return { success: true, message: `Successfully indexed ${file.name}.`, chunks: chunks.length };
    } catch (error) {
        console.error('Error uploading knowledge:', error);
        Sentry.captureException(error, { tags: { function: 'uploadKnowledge', userId, fileName: file.name } });
        return { success: false, message: `Failed to index ${file.name}.` };
    }
}

export async function reindexMemories(userId: string, agentId: string): Promise<{ success: boolean; message?: string; processed?: number; skipped?: number; errors?: number }> {
    'use server';
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }
    
    const firestoreAdmin = getFirestoreAdmin();
    
    try {
        console.log(`[ReindexMemories] Starting re-index for user ${userId} and agent ${agentId}`);
        
        const memoriesRef = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/memories`);
        const snapshot = await memoriesRef
            .where('userId', '==', userId)
            .limit(1000)
            .get();
        
        console.log(`[ReindexMemories] Found ${snapshot.size} memories for user ${userId}`);
        
        let processed = 0;
        let skipped = 0;
        let errors = 0;
        
        const batch = firestoreAdmin.batch();
        let batchCount = 0;
        const BATCH_SIZE = 500; // Firestore batch limit
        
        for (const doc of snapshot.docs) {
            const data = doc.data();
            const memoryId = doc.id;
            const agentId = data.agentId || 'universe';
            
            // Check if embedding exists and is valid (1536 dimensions)
            const hasValidEmbedding = data.embedding && 
                                      Array.isArray(data.embedding) && 
                                      data.embedding.length === 1536 &&
                                      data.embedding.some((v: any) => v !== 0); // Check it's not all zeros
            
            if (hasValidEmbedding) {
                skipped++;
                continue;
            }
            
            try {
                if (!data.content || typeof data.content !== 'string' || !data.content.trim()) {
                    console.warn(`[ReindexMemories] Memory ${memoryId} has no valid content, skipping`);
                    skipped++;
                    continue;
                }
                
                console.log(`[ReindexMemories] Generating embedding for memory ${memoryId}: "${data.content.substring(0, 50)}..."`);
                
                // Generate embedding
                const embedding = await getEmbedding(data.content);
                
                // Update document with embedding in Firestore
                batch.update(doc.ref, {
                    embedding: embedding,
                    reindexedAt: FieldValue.serverTimestamp(),
                });

                // Upsert to Qdrant
                const collectionName = `memories_${agentId}`;
                await upsertPoint(collectionName, {
                    id: memoryId,
                    vector: embedding,
                    payload: {
                        content: data.content,
                        userId,
                        agentId,
                        source: 'reindex',
                        createdAt: new Date().toISOString()
                    }
                });
                
                batchCount++;
                processed++;
                
                // Commit batch if it reaches the limit
                if (batchCount >= BATCH_SIZE) {
                    await batch.commit();
                    console.log(`[ReindexMemories] Committed batch of ${batchCount} updates`);
                    batchCount = 0;
                    // Small delay to avoid rate limits
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                
            } catch (error: any) {
                console.error(`[ReindexMemories] Error re-indexing memory ${memoryId}:`, error);
                errors++;
            }
        }
        
        // Commit remaining updates
        if (batchCount > 0) {
            await batch.commit();
            console.log(`[ReindexMemories] Committed final batch of ${batchCount} updates`);
        }
        
        console.log(`[ReindexMemories] Complete: processed=${processed}, skipped=${skipped}, errors=${errors}`);
        
        revalidatePath('/settings');
        
        return {
            success: true,
            message: `Re-indexed ${processed} memories. ${skipped} already had embeddings. ${errors} errors.`,
            processed,
            skipped,
            errors,
        };
    } catch (error: any) {
        console.error('[ReindexMemories] Fatal error:', error);
        Sentry.captureException(error, { tags: { function: 'reindexMemories', userId } });
        return {
            success: false,
            message: `Failed to re-index memories: ${error.message}`,
        };
    }
}

export async function generateUserApiKey(userId: string): Promise<{ success: boolean, apiKey?: string, message?: string }> {
    if (!userId) {
      return { success: false, message: 'User not authenticated.' };
    }
  
    const firestoreAdmin = getFirestoreAdmin();
    try {
      const apiKey = `pk-live-${randomBytes(24).toString('hex')}`;
      
      const settingsRef = firestoreAdmin.collection('settings').doc(userId);
      await settingsRef.set({ personal_api_key: apiKey }, { merge: true });

      await firestoreAdmin.collection('api_clients').add({
        apiKey,
        createdAt: FieldValue.serverTimestamp(),
        userId,
        label: 'Personal API Key',
        isActive: true,
      });
      
      revalidatePath('/settings');
      return { success: true, apiKey: apiKey };

    } catch (error) {
      console.error('Error generating API key:', error);
      Sentry.captureException(error, { tags: { function: 'generateUserApiKey', userId } });
      return { success: false, message: 'Failed to generate API key.' };
    }
}

/**
 * Exports all user data for GDPR compliance.
 * Returns a JSON object containing all user data from Firestore.
 */
export async function exportUserData(userId: string): Promise<{ success: boolean, data?: any, message?: string }> {
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }

    const firestoreAdmin = getFirestoreAdmin();
    try {
        const exportData: any = {
            userId,
            exportedAt: new Date().toISOString(),
            threads: [],
            messages: [],
            memories: [],
            artifacts: [],
            settings: null,
            userState: null,
        };

        // Export threads
        const threadsSnapshot = await firestoreAdmin
            .collection('threads')
            .where('userId', '==', userId)
            .get();
        exportData.threads = threadsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        }));

        // Export messages (history)
        const messagesSnapshot = await firestoreAdmin
            .collection('history')
            .where('userId', '==', userId)
            .get();
        exportData.messages = messagesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            // Remove embeddings for privacy/size
            embedding: undefined,
        }));

        // Export memories
        const memoriesSnapshot = await firestoreAdmin
            .collection('memories')
            .where('userId', '==', userId)
            .get();
        exportData.memories = memoriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            embedding: undefined,
        }));

        // Export artifacts
        const artifactsSnapshot = await firestoreAdmin
            .collection('artifacts')
            .where('userId', '==', userId)
            .get();
        exportData.artifacts = artifactsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        }));

        // Export settings
        const settingsDoc = await firestoreAdmin.collection('settings').doc(userId).get();
        if (settingsDoc.exists) {
            const settingsData = settingsDoc.data();
            // Remove API key from export for security
            exportData.settings = {
                ...settingsData,
                personal_api_key: undefined,
            };
        }

        // Export user state
        const stateSnapshot = await firestoreAdmin
            .collection('users')
            .doc(userId)
            .collection('state')
            .get();
        exportData.userState = {};
        stateSnapshot.docs.forEach(doc => {
            exportData.userState[doc.id] = doc.data();
        });

        return { success: true, data: exportData };
    } catch (error) {
        console.error('Error exporting user data:', error);
        Sentry.captureException(error, { tags: { function: 'exportUserData', userId } });
        return { success: false, message: 'Failed to export user data.' };
    }
}

export async function updateThread(threadId: string, userId: string, agentId: string, updates: { title?: string; pinned?: boolean; archived?: boolean }): Promise<{ success: boolean; message?: string }> {
    if (!userId || !threadId) {
        return { success: false, message: 'User not authenticated or thread ID missing.' };
    }

    const firestoreAdmin = getFirestoreAdmin();
    try {
        const threadRef = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/threads`).doc(threadId);
        const threadDoc = await threadRef.get();
        
        if (!threadDoc.exists) {
            return { success: false, message: 'Thread not found.' };
        }
        
        const threadData = threadDoc.data();
        if (threadData?.userId !== userId) {
            return { success: false, message: 'Permission denied.' };
        }

        await threadRef.update(updates);
        revalidatePath('/');
        return { success: true, message: 'Thread updated successfully.' };
    } catch (error) {
        console.error('Error updating thread:', error);
        Sentry.captureException(error, { tags: { function: 'updateThread', userId, threadId } });
        return { success: false, message: 'Failed to update thread.' };
    }
}

export async function deleteThread(threadId: string, userId: string, agentId: string): Promise<{ success: boolean; message?: string }> {
    if (!userId || !threadId) {
        return { success: false, message: 'User not authenticated or thread ID missing.' };
    }

    const firestoreAdmin = getFirestoreAdmin();
    try {
        const threadRef = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/threads`).doc(threadId);
        const threadDoc = await threadRef.get();
        
        if (!threadDoc.exists) {
            return { success: false, message: 'Thread not found.' };
        }
        
        const threadData = threadDoc.data();
        if (threadData?.userId !== userId) {
            return { success: false, message: 'Permission denied.' };
        }

        // Delete all messages in this thread
        const historyQuery = firestoreAdmin.collection(`users/${userId}/agents/${agentId}/history`)
            .where('userId', '==', userId)
            .where('threadId', '==', threadId);
        
        const historySnapshot = await historyQuery.get();
        const batch = firestoreAdmin.batch();
        
        historySnapshot.docs.forEach(doc => {
            batch.delete(doc.ref);
        });
        
        // Delete the thread itself
        batch.delete(threadRef);
        
        await batch.commit();
        
        revalidatePath('/');
        return { success: true, message: 'Thread deleted successfully.' };
    } catch (error) {
        console.error('Error deleting thread:', error);
        Sentry.captureException(error, { tags: { function: 'deleteThread', userId, threadId } });
        return { success: false, message: 'Failed to delete thread.' };
    }
}

    
