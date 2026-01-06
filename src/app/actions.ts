
'use server';

import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { runChatLane } from '@/ai/flows/run-chat-lane';
import { generateEmbedding, generateEmbeddingsBatch, searchHistory } from '@/lib/vector';
import { SearchResult, Thread } from '@/lib/types';
import { getStorage } from 'firebase-admin/storage';
import { getDownloadURL } from 'firebase-admin/storage';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import { chunkText } from '@/lib/chunking';
import { FieldValue }from 'firebase-admin/firestore';
import { randomBytes } from 'crypto';
import { summarizeLongChat } from '@/ai/flows/summarize-long-chat';
import * as Sentry from '@sentry/nextjs';
import { checkRateLimit } from '@/lib/rate-limit';
import { trackEvent } from '@/lib/analytics';

// Lazy initialization to avoid build-time errors
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Please set it in your environment variables.');
  }
  return new OpenAI({ apiKey });
}

export async function createThread(userId: string): Promise<string> {
    const firestoreAdmin = getFirestoreAdmin();
    const threadRef = firestoreAdmin.collection('threads').doc();
    await threadRef.set({
        id: threadRef.id,
        userId: userId,
        title: 'New Chat',
        createdAt: FieldValue.serverTimestamp(),
    });
    return threadRef.id;
}

export async function getUserThreads(userId: string) {
  try {
    if (!userId) return [];
    const firestoreAdmin = getFirestoreAdmin();
    // 1. Try to find threads (Safely)
    const threadsRef = firestoreAdmin.collection('threads');
    
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
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString() 
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
    const audioFile = formData.get('audio_file') as File;
    const userId = formData.get('userId') as string;
    const threadId = formData.get('threadId') as string | null;

    if (!audioFile || !userId) {
        return { success: false, message: 'Audio file or user ID missing.' };
    }

    try {
        const openai = getOpenAI();
        const transcription = await openai.audio.transcriptions.create({
            model: 'whisper-1',
            file: audioFile,
        });

        const transcribedText = transcription.text;
        
        let messageId: string | undefined;
        let newThreadId: string | undefined;

        if (transcribedText) {
            const messageFormData = new FormData();
            messageFormData.append('message', transcribedText);
            messageFormData.append('userId', userId);
            if (threadId) {
                messageFormData.append('threadId', threadId);
            }
            messageFormData.append('source', 'voice');
            const result = await submitUserMessage(messageFormData);
            messageId = result?.messageId;
            newThreadId = result?.threadId;
        }

        return { success: true, messageId, threadId: newThreadId };
    } catch (error) {
        console.error('Error transcribing audio:', error);
        Sentry.captureException(error, { tags: { function: 'transcribeAndProcessMessage' } });
        return { success: false, message: 'Failed to transcribe audio.' };
    }
}


export async function submitUserMessage(formData: FormData) {
    const messageContent = formData.get('message') as string;
    const userId = formData.get('userId') as string;
    let threadId = formData.get('threadId') as string | null;
    const imageBase64 = formData.get('image_data') as string | null;
    const source = formData.get('source') as string || 'text';
  
    if (!userId) {
      console.error('submitUserMessage Error: User ID is missing.');
      throw new Error('User not authenticated');
    }

    // Check rate limit for messages
    const rateLimitCheck = await checkRateLimit(userId, 'messages');
    if (!rateLimitCheck.success) {
      return { 
        messageId: undefined, 
        threadId: undefined,
        error: rateLimitCheck.message || 'Rate limit exceeded. Please try again later.'
      };
    }
  
    if ((!messageContent || !messageContent.trim()) && !imageBase64) {
      return;
    }
    
    const firestoreAdmin = getFirestoreAdmin();
    // If no threadId is provided, create a new thread.
    if (!threadId) {
        threadId = await createThread(userId);
        // Auto-generate title for the new thread
        const newTitle = messageContent.substring(0, 40) + (messageContent.length > 40 ? '...' : '');
        await firestoreAdmin.collection('threads').doc(threadId).update({ title: newTitle });
    }
  
    const historyCollection = firestoreAdmin.collection('history');
    let userMessageId: string;
  
    try {
      const embedding = await generateEmbedding(messageContent || 'image');
  
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
  
      // Pass the threadId to the AI lane
      await runChatLane({
          userId,
          message: messageContent,
          imageBase64,
          source,
          threadId,
      });
      
  
      return { messageId: userMessageId, threadId: threadId };

    } catch (error) {
        console.error('Firestore Write Failed in submitUserMessage:', error);
        Sentry.captureException(error, { tags: { function: 'submitUserMessage', userId } });
        return { messageId: undefined, threadId: undefined };
    }
}

export async function summarizeThread(threadId: string, userId: string): Promise<void> {
    const firestoreAdmin = getFirestoreAdmin();
    const historyCollection = firestoreAdmin.collection('history');
    const threadRef = firestoreAdmin.collection('threads').doc(threadId);

    const snapshot = await historyCollection
        .where('threadId', '==', threadId)
        .where('userId', '==', userId)
        .orderBy('createdAt', 'asc')
        .get();

    // Only summarize if there are more than 10 messages
    if (snapshot.docs.length < 10) {
        return;
    }

    const chatHistory = snapshot.docs.map(doc => {
        const data = doc.data();
        return `${data.role}: ${data.content}`;
    }).join('\n');

    try {
        const { summary } = await summarizeLongChat({ chatHistory });
        if (summary) {
            await threadRef.update({ summary });
        }
    } catch (error) {
        console.error('Failed to summarize thread:', error);
        Sentry.captureException(error, { tags: { function: 'summarizeThread', threadId, userId } });
    }
}

export async function searchMemoryAction(query: string, userId: string): Promise<SearchResult[]> {
    if (!query.trim() || !userId) {
        return [];
    }

    const results = await searchHistory(query, userId);

    return results.map(result => ({
        id: result.id,
        text: result.text,
        score: result.score,
        timestamp: result.timestamp.toISOString() 
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

export async function clearMemory(userId: string) {
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }
    const firestoreAdmin = getFirestoreAdmin();
    const historyQuery = firestoreAdmin.collection('history').where('userId', '==', userId);
    const memoriesQuery = firestoreAdmin.collection('memories').where('userId', '==', userId);
    const stateCollectionRef = firestoreAdmin.collection('users').doc(userId).collection('state');
    const artifactsQuery = firestoreAdmin.collection('artifacts').where('userId', '==', userId);

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
        const threadsSnapshot = await firestoreAdmin.collection('threads').where('userId', '==', userId).get();
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

export async function getMemories(userId: string, query?: string) {
    'use server';
    try {
      if (!userId) {
        console.warn('getMemories: User not authenticated');
        return [];
      }
    
      const firestoreAdmin = getFirestoreAdmin();
      const historyCollection = firestoreAdmin.collection('history');
    
      if (query && query.trim()) {
        try {
          const searchResults = await searchHistory(query, userId);
          if (searchResults.length === 0) return [];
          const docIds = searchResults.map(r => r.id);
          
          // Get documents by IDs - Firestore Admin SDK doesn't support 'in' with documentId directly
          // Instead, fetch each document individually (or use a different approach)
          const memoryDocs = await Promise.all(
            docIds.slice(0, 10).map(id => historyCollection.doc(id).get())
          );
          const memoryDocsArray = memoryDocs.filter(doc => doc.exists).map(doc => doc);
          const userFilteredDocs = memoryDocsArray.filter(doc => doc.data()?.userId === userId);
          return userFilteredDocs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (searchError: any) {
          console.error('Error in semantic search for memories:', searchError);
          // Fallback to regular query if semantic search fails
          const snapshot = await historyCollection
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();
          return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }

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
  
export async function deleteMemory(id: string, userId: string) {
    'use server';
    if (!userId) {
      return { success: false, message: 'User not authenticated.' };
    }
    const firestoreAdmin = getFirestoreAdmin();
    try {
      const docRef = firestoreAdmin.collection('history').doc(id);
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
  
export async function updateMemory(id: string, newText: string, userId: string) {
    'use server';
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }
    const firestoreAdmin = getFirestoreAdmin();
    try {
        const docRef = firestoreAdmin.collection('history').doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists || docSnap.data()?.userId !== userId) {
            return { success: false, message: 'Permission denied.' };
        }
        const newEmbedding = await generateEmbedding(newText);
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

export async function deleteMemoryFromMemories(id: string, userId: string): Promise<{ success: boolean; message?: string }> {
    'use server';
    if (!userId) {
      return { success: false, message: 'User not authenticated.' };
    }
    const firestoreAdmin = getFirestoreAdmin();
    try {
      const docRef = firestoreAdmin.collection('memories').doc(id);
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

export async function updateMemoryInMemories(id: string, newText: string, userId: string): Promise<{ success: boolean; message?: string }> {
    'use server';
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }
    const firestoreAdmin = getFirestoreAdmin();
    try {
        const docRef = firestoreAdmin.collection('memories').doc(id);
        const docSnap = await docRef.get();
        if (!docSnap.exists || docSnap.data()?.userId !== userId) {
            return { success: false, message: 'Permission denied.' };
        }
        const newEmbedding = await generateEmbedding(newText);
        await docRef.update({
            content: newText,
            embedding: newEmbedding,
            editedAt: FieldValue.serverTimestamp(),
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
            const data = await pdf(fileBuffer);
            rawContent = data.text;
        } else if (file.type.startsWith('text/')) {
            rawContent = fileBuffer.toString('utf-8');
        } else {
            return { success: false, message: `Unsupported file type: ${file.type}` };
        }

        const chunks = chunkText(rawContent);
        const historyCollection = firestoreAdmin.collection('history');
        
        // Generate embeddings in batch for cost efficiency
        const embeddings = await generateEmbeddingsBatch(chunks);
        
        const batch = firestoreAdmin.batch();
        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = embeddings[i];
            const docRef = historyCollection.doc();
            
            batch.set(docRef, {
                id: docRef.id,
                role: 'assistant',
                type: 'knowledge_chunk',
                source_filename: file.name,
                content: chunk,
                embedding: embedding,
                createdAt: FieldValue.serverTimestamp(),
                userId: userId,
            });
        }
        
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

export async function reindexMemories(userId: string): Promise<{ success: boolean; message?: string; processed?: number; skipped?: number; errors?: number }> {
    'use server';
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }
    
    const firestoreAdmin = getFirestoreAdmin();
    const { generateEmbedding } = await import('@/lib/vector');
    
    try {
        console.log(`[ReindexMemories] Starting re-index for user ${userId}`);
        
        const memoriesRef = firestoreAdmin.collection('memories');
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
                const embedding = await generateEmbedding(data.content);
                
                // Update document with embedding
                batch.update(doc.ref, {
                    embedding: embedding,
                    reindexedAt: FieldValue.serverTimestamp(),
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
      const apiKey = `sk-pandora-${randomBytes(24).toString('hex')}`;
      
      const settingsRef = firestoreAdmin.collection('settings').doc(userId);
      await settingsRef.set({ personal_api_key: apiKey }, { merge: true });
      
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

    
