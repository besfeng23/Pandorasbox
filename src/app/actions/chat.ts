'use server';

import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { runChatLane } from '@/ai/flows/run-chat-lane';
// import { generateEmbedding } from '@/lib/vector'; // Removed sync embedding
import { Thread } from '@/lib/types';
import { getStorage, getDownloadURL } from 'firebase-admin/storage';
import OpenAI from 'openai';
import { FieldValue } from 'firebase-admin/firestore';
import { summarizeLongChat } from '@/ai/flows/summarize-long-chat';
import * as Sentry from '@sentry/nextjs';
import { checkRateLimit } from '@/lib/rate-limit';
import { trackEvent } from '@/lib/analytics';
import { v4 as uuidv4 } from 'uuid';
import { getActiveWorkspaceIdForUser } from '@/lib/workspaces';
import { sendKairosEvent } from '@/lib/kairosClient';

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
    const workspaceId = await getActiveWorkspaceIdForUser(userId);
    const threadRef = firestoreAdmin.collection('threads').doc();
    await threadRef.set({
        id: threadRef.id,
        userId: userId,
        workspaceId,
        title: 'New Chat',
        createdAt: FieldValue.serverTimestamp(),
    });
    
    // Emit Kairos event: thread created
    sendKairosEvent('ui.thread.created', {
        threadId: threadRef.id,
        userId,
    }).catch(err => console.warn('Failed to emit thread.created event:', err));
    
    return threadRef.id;
}

export async function getUserThreads(userId: string) {
  try {
    if (!userId) return [];
    const firestoreAdmin = getFirestoreAdmin();
    const workspaceId = await getActiveWorkspaceIdForUser(userId);
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
        // Backfill workspaceId for legacy threads (pre-workspace) into the user's current active workspace.
        if (!data.workspaceId) {
          doc.ref.set({ workspaceId }, { merge: true }).catch(() => {});
        } else if (data.workspaceId !== workspaceId) {
          return null;
        }
        return {
          id: doc.id,
          userId: data.userId,
          title: data.title || 'New Chat',
          // CRITICAL FIX: Convert Firestore Timestamp to a plain String
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString() 
        } as Thread;
      }).filter(Boolean) as Thread[];

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

/**
 * Authenticated variant for clients: verifies idToken server-side and returns workspace-scoped threads.
 * This is the preferred call path for SaaS multi-tenant workspaces.
 */
export async function getUserThreadsAuthed(idToken: string) {
  if (!idToken) return [];
  const auth = getAuthAdmin();
  const decoded = await auth.verifyIdToken(idToken);
  return await getUserThreads(decoded.uid);
}

/**
 * Authenticated variant for clients: creates a thread in the user's active workspace.
 */
export async function createThreadAuthed(idToken: string): Promise<string> {
  if (!idToken) throw new Error('User not authenticated');
  const auth = getAuthAdmin();
  const decoded = await auth.verifyIdToken(idToken);
  return await createThread(decoded.uid);
}

export async function transcribeAndProcessMessage(formData: FormData) {
    const audioFile = formData.get('audio_file') as File;
    const idToken = formData.get('idToken') as string;
    const threadId = formData.get('threadId') as string | null;

    if (!audioFile || !idToken) {
        return { success: false, message: 'Audio file or ID token missing.' };
    }

    try {
        const auth = getAuthAdmin();
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

        // Upload audio file to Firebase Storage
        const storage = getStorage();
        const bucket = storage.bucket();
        const fileExtension = audioFile.name.split('.').pop() || 'webm';
        const fileName = `audio/${userId}/${uuidv4()}.${fileExtension}`;
        const fileRef = bucket.file(fileName);
        
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        await fileRef.save(buffer, {
            metadata: {
                contentType: audioFile.type || 'audio/webm',
            }
        });

        // Use GCS URI for internal processing (Vertex AI)
        const audioUrl = `gs://${bucket.name}/${fileName}`;
        // Also get a signed URL or public URL if needed for frontend, but for now we use GCS URI for backend
        
        let messageId: string | undefined;
        let newThreadId: string | undefined;

        const messageFormData = new FormData();
        messageFormData.append('message', ''); // Empty text, just audio
        messageFormData.append('idToken', idToken);
        if (threadId) {
            messageFormData.append('threadId', threadId);
        }
        messageFormData.append('source', 'voice');
        messageFormData.append('audioUrl', audioUrl); // Pass the GCS URL

        const result = await submitUserMessage(messageFormData);
        messageId = result?.messageId;
        newThreadId = result?.threadId;

        return { success: true, messageId, threadId: newThreadId };
    } catch (error) {
        console.error('Error processing audio:', error);
        Sentry.captureException(error, { tags: { function: 'transcribeAndProcessMessage' } });
        return { success: false, message: 'Failed to process audio.' };
    }
}


export async function submitUserMessage(formData: FormData) {
    const messageContent = formData.get('message') as string;
    const idToken = formData.get('idToken') as string;
    // const userId = formData.get('userId') as string; // Legacy
    let threadId = formData.get('threadId') as string | null;
    const imageBase64 = formData.get('image_data') as string | null;
    const source = formData.get('source') as string || 'text';
    const audioUrl = formData.get('audioUrl') as string | null;
  
    if (!idToken) {
      console.error('submitUserMessage Error: ID token is missing.');
      throw new Error('User not authenticated');
    }

    const auth = getAuthAdmin();
    const decodedToken = await auth.verifyIdToken(idToken);
    const userId = decodedToken.uid;

    // Check rate limit for messages
    const rateLimitCheck = await checkRateLimit(userId, 'messages');
    if (!rateLimitCheck.success) {
      // Emit Kairos event: rate limit triggered
      sendKairosEvent('system.ratelimit.triggered', {
        limitType: 'messages',
        userId,
      }).catch(err => console.warn('Failed to emit ratelimit.triggered event:', err));
      
      return { 
        messageId: undefined, 
        threadId: undefined,
        error: rateLimitCheck.message || 'Rate limit exceeded. Please try again later.'
      };
    }
  
    // Allow empty message if audioUrl is present
    if ((!messageContent || !messageContent.trim()) && !imageBase64 && !audioUrl) {
      return;
    }
    
    const firestoreAdmin = getFirestoreAdmin();
    const activeWorkspaceId = await getActiveWorkspaceIdForUser(userId);
    // If no threadId is provided, create a new thread.
    if (!threadId) {
        threadId = await createThread(userId);
        // Auto-generate title for the new thread - use first meaningful sentence or first 50 chars
        let newTitle = 'New Chat';
        if (messageContent && messageContent.trim()) {
          // Try to extract first sentence (up to 50 chars) or first 50 chars
          const firstSentence = messageContent.split(/[.!?]\s/)[0].trim();
          newTitle = firstSentence.length > 0 && firstSentence.length <= 50 
            ? firstSentence 
            : messageContent.substring(0, 50).trim() + (messageContent.length > 50 ? '...' : '');
        } else if (audioUrl) {
          newTitle = 'Voice Note';
        } else if (imageBase64) {
          newTitle = 'Image Message';
        }
        await firestoreAdmin.collection('threads').doc(threadId).update({ title: newTitle });
    }

    // Resolve thread workspaceId (threads created before workspace support might not have it).
    let threadWorkspaceId = activeWorkspaceId;
    try {
      const threadSnap = await firestoreAdmin.collection('threads').doc(threadId).get();
      const tdata = threadSnap.data();
      if (tdata?.workspaceId) {
        threadWorkspaceId = tdata.workspaceId;
      } else {
        await firestoreAdmin.collection('threads').doc(threadId).set({ workspaceId: threadWorkspaceId }, { merge: true });
      }
    } catch {
      // Best-effort; keep activeWorkspaceId fallback.
    }
  
    const historyCollection = firestoreAdmin.collection('history');
    let userMessageId: string;
  
    try {
      // Async Nervous System: Removed synchronous embedding generation
      // const embedding = await generateEmbedding(messageContent || 'image'); 
      
      const userMessageData = {
        role: 'user',
        content: messageContent,
        createdAt: FieldValue.serverTimestamp(),
        userId: userId,
        threadId: threadId,
        workspaceId: threadWorkspaceId,
        imageUrl: null,
        audioUrl: audioUrl || null, // Store audio URL
        source: source,
        // embedding: embedding, // Removed synchronous embedding
      };

      const userMessageRef = await historyCollection.add(userMessageData);
      userMessageId = userMessageRef.id;
      await userMessageRef.update({ id: userMessageId });
  
      // Track analytics
      await trackEvent(userId, 'message_sent', { threadId, hasImage: !!imageBase64, hasAudio: !!audioUrl });
      // await trackEvent(userId, 'embedding_generated'); // Removed as it's now async
  
      // Emit Kairos events
      sendKairosEvent('ui.chat.message_sent', {
        threadId,
        messageId: userMessageId,
        userId,
      }, { correlationId: threadId }).catch(err => console.warn('Failed to emit message_sent event:', err));
      
      sendKairosEvent('system.message.persisted', {
        messageId: userMessageId,
        role: 'user',
        userId,
      }, { correlationId: threadId }).catch(err => console.warn('Failed to emit message.persisted event:', err));
  
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
      after(async () => {
        try {
          // We need to pass the audioUrl to runChatLane
          await runChatLane({
              userId,
              message: messageContent,
              messageId: userMessageId, // Pass messageId for async embedding update
              imageBase64,
              audioUrl: audioUrl || undefined, // Pass audioUrl
              source,
              threadId,
          });
        } catch (error: any) {
          console.error('[submitUserMessage] runChatLane failed:', error);
          Sentry.captureException(error, { 
            tags: { function: 'runChatLane', userId, threadId },
            extra: { messageContent: messageContent?.substring(0, 100) }
          });
          
          // Create error message in Firestore so user sees it
          try {
            const firestoreAdmin = getFirestoreAdmin();
            const errorMessageRef = firestoreAdmin.collection('history').doc();
            await errorMessageRef.set({
              id: errorMessageRef.id,
              role: 'assistant',
              content: `Sorry, I encountered an error processing your message. Please try again. If this persists, check your API keys in Settings.`,
              status: 'error',
              progress_log: [`Error: ${error?.message || 'Unknown error'}`],
              createdAt: FieldValue.serverTimestamp(),
              userId: userId,
              threadId: threadId,
            });
          } catch (updateError) {
            console.error('[submitUserMessage] Failed to create error message:', updateError);
          }
        }
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
            
            // Emit Kairos event: thread summary generated
            sendKairosEvent('system.thread.summary_generated', {
                threadId,
                userId,
            }).catch(err => console.warn('Failed to emit thread.summary_generated event:', err));
        }
    } catch (error) {
        console.error('Failed to summarize thread:', error);
        Sentry.captureException(error, { tags: { function: 'summarizeThread', threadId, userId } });
    }
}

export async function updateThread(threadId: string, userId: string, updates: { title?: string; pinned?: boolean; archived?: boolean }): Promise<{ success: boolean; message?: string }> {
    if (!userId || !threadId) {
        return { success: false, message: 'User not authenticated or thread ID missing.' };
    }

    const firestoreAdmin = getFirestoreAdmin();
    try {
        const threadRef = firestoreAdmin.collection('threads').doc(threadId);
        const threadDoc = await threadRef.get();
        
        if (!threadDoc.exists) {
            return { success: false, message: 'Thread not found.' };
        }
        
        const threadData = threadDoc.data();
        if (threadData?.userId !== userId) {
            return { success: false, message: 'Permission denied.' };
        }

        await threadRef.update(updates);
        
        // Emit Kairos event: thread updated
        if (updates.title) {
            sendKairosEvent('system.thread.updated', {
                threadId,
                title: updates.title,
                userId,
            }).catch(err => console.warn('Failed to emit thread.updated event:', err));
        }
        
        revalidatePath('/');
        return { success: true, message: 'Thread updated successfully.' };
    } catch (error) {
        console.error('Error updating thread:', error);
        Sentry.captureException(error, { tags: { function: 'updateThread', userId, threadId } });
        return { success: false, message: 'Failed to update thread.' };
    }
}

export async function deleteThread(threadId: string, userId: string): Promise<{ success: boolean; message?: string }> {
    if (!userId || !threadId) {
        return { success: false, message: 'User not authenticated or thread ID missing.' };
    }

    const firestoreAdmin = getFirestoreAdmin();
    try {
        const threadRef = firestoreAdmin.collection('threads').doc(threadId);
        const threadDoc = await threadRef.get();
        
        if (!threadDoc.exists) {
            return { success: false, message: 'Thread not found.' };
        }
        
        const threadData = threadDoc.data();
        if (threadData?.userId !== userId) {
            return { success: false, message: 'Permission denied.' };
        }

        // Delete all messages in this thread
        const historyQuery = firestoreAdmin.collection('history')
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
