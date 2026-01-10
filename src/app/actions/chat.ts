'use server';

import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { after } from 'next/server';
import { runChatLane } from '@/ai/flows/run-chat-lane';
import { generateEmbedding } from '@/lib/vector';
import { Thread } from '@/lib/types';
import { getStorage, getDownloadURL } from 'firebase-admin/storage';
import OpenAI from 'openai';
import { FieldValue } from 'firebase-admin/firestore';
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
    // const userId = formData.get('userId') as string; // Legacy
    const idToken = formData.get('idToken') as string;
    const threadId = formData.get('threadId') as string | null;

    if (!audioFile || !idToken) {
        return { success: false, message: 'Audio file or ID token missing.' };
    }

    try {
        const auth = getAuthAdmin();
        const decodedToken = await auth.verifyIdToken(idToken);
        const userId = decodedToken.uid;

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
            messageFormData.append('idToken', idToken);
            // messageFormData.append('userId', userId); // Not needed if we verify token
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
    const idToken = formData.get('idToken') as string;
    // const userId = formData.get('userId') as string; // Legacy
    let threadId = formData.get('threadId') as string | null;
    const imageBase64 = formData.get('image_data') as string | null;
    const source = formData.get('source') as string || 'text';
  
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
      after(async () => {
        await runChatLane({
            userId,
            message: messageContent,
            imageBase64,
            source,
            threadId,
        });
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

