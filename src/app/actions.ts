'use server';

import { admin } from '@/lib/firebase-admin';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { runChatLane } from '@/ai/flows/run-chat-lane';
import { generateEmbedding, searchHistory } from '@/lib/vector';
import { SearchResult } from '@/lib/types';
import { getStorage } from 'firebase-admin/storage';
import { getDownloadURL } from 'firebase-admin/storage';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import { chunkText } from '@/lib/chunking';


const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAndProcessMessage(formData: FormData) {
    const audioFile = formData.get('audio_file') as File;
    const userId = formData.get('userId') as string;

    if (!audioFile || !userId) {
        return { success: false, message: 'Audio file or user ID missing.' };
    }

    try {
        const transcription = await openai.audio.transcriptions.create({
            model: 'whisper-1',
            file: audioFile,
        });

        const transcribedText = transcription.text;
        
        let messageId: string | undefined;

        if (transcribedText) {
            const messageFormData = new FormData();
            messageFormData.append('message', transcribedText);
            messageFormData.append('userId', userId);
            messageFormData.append('source', 'voice'); // Add source
            const result = await submitUserMessage(messageFormData);
            messageId = result?.messageId;
        }

        return { success: true, messageId };
    } catch (error) {
        console.error('Error transcribing audio:', error);
        return { success: false, message: 'Failed to transcribe audio.' };
    }
}


export async function submitUserMessage(formData: FormData) {
    const messageContent = formData.get('message') as string;
    const userId = formData.get('userId') as string;
    const imageBase64 = formData.get('image_data') as string | null;
    const source = formData.get('source') as string || 'text';
  
    if (!userId) {
      console.error('submitUserMessage Error: User ID is missing.');
      throw new Error('User not authenticated');
    }
  
    if ((!messageContent || !messageContent.trim()) && !imageBase64) {
      return;
    }
  
    const historyCollection = firestoreAdmin.collection('history');
    let userMessageId: string;
  
    try {
      const embedding = await generateEmbedding(messageContent || 'image');
  
      // Save user message to Firestore.
      const userMessageData = {
        role: 'user',
        content: messageContent,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: userId, // CRITICAL: Ensure userId is saved
        imageUrl: null,
        source: source,
        embedding: embedding,
      };

      const userMessageRef = await historyCollection.add(userMessageData);
      userMessageId = userMessageRef.id;
      await userMessageRef.update({ id: userMessageId });
  
      console.log('Successfully wrote user message to history for user:', userId);
  
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
  
      // --- AI Placeholder ---
      const aiResponseText = `I received: "${messageContent}"`; 

      // Add AI Response
      await historyCollection.add({
        content: aiResponseText,
        role: 'assistant',
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: userId
      });
      
      revalidatePath('/');
  
      return { messageId: userMessageId };
  
    } catch (error) {
        console.error('Firestore Write Failed in submitUserMessage:', error);
        // We are not returning an error to the client to avoid an error popup,
        // but we are logging it for debugging.
        return { messageId: undefined };
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

    try {
        await firestoreAdmin.collection('settings').doc(userId).set(settingsData, { merge: true });
        revalidatePath('/settings');
        return { success: true, message: 'Settings updated successfully.' };
    } catch (error) {
        console.error('Error updating settings:', error);
        return { success: false, message: 'Failed to update settings.' };
    }
}

export async function clearMemory(userId: string) {
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }
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

        revalidatePath('/');
        revalidatePath('/settings');
        return { success: true, message: 'Memory cleared successfully.' };
    } catch (error) {
        console.error('Error clearing memory:', error);
        return { success: false, message: 'Failed to clear memory.' };
    }
}

export async function getMemories(userId: string, query?: string) {
    'use server';
    if (!userId) {
      throw new Error('User not authenticated');
    }
  
    const historyCollection = firestoreAdmin.collection('history');
  
    if (query && query.trim()) {
      const searchResults = await searchHistory(query, userId);
      if (searchResults.length === 0) return [];
      const docIds = searchResults.map(r => r.id);
      
      const memoryDocs = await historyCollection.where(admin.firestore.FieldPath.documentId(), 'in', docIds).get();
      // Additional client-side filter because 'in' queries can't be combined with other filters in all cases
      const userFilteredDocs = memoryDocs.docs.filter(doc => doc.data().userId === userId);
      return userFilteredDocs.map(doc => ({ id: doc.id, ...doc.data() }));

    } else {
      const snapshot = await historyCollection
        .where('userId', '==', userId)
        .orderBy('timestamp', 'desc')
        .limit(50)
        .get();
      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    }
}
  
export async function deleteMemory(id: string, userId: string) {
    'use server';
    if (!userId) {
      return { success: false, message: 'User not authenticated.' };
    }
    try {
      const docRef = firestoreAdmin.collection('history').doc(id);
      const docSnap = await docRef.get();
      if (docSnap.exists && docSnap.data()?.userId === userId) {
        await docRef.delete();
        revalidatePath('/settings');
        revalidatePath('/');
        return { success: true };
      }
      return { success: false, message: 'Permission denied or document not found.'}
    } catch (error) {
      console.error('Error deleting memory:', error);
      return { success: false, message: 'Failed to delete memory.' };
    }
}
  
export async function updateMemory(id: string, newText: string, userId: string) {
    'use server';
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }
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
            editedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        revalidatePath('/settings');
        revalidatePath('/');
        return { success: true };
    } catch (error) {
        console.error('Error updating memory:', error);
        return { success: false, message: 'Failed to update memory.' };
    }
}

export async function uploadKnowledge(formData: FormData): Promise<{ success: boolean; message: string; chunks?: number }> {
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    if (!file || !userId) {
        return { success: false, message: 'File or user ID missing.' };
    }

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
        const batch = firestoreAdmin.batch();

        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            const embedding = await generateEmbedding(chunk);
            const docRef = historyCollection.doc();
            
            batch.set(docRef, {
                id: docRef.id,
                role: 'assistant',
                type: 'knowledge_chunk',
                source_filename: file.name,
                content: chunk,
                embedding: embedding,
                timestamp: admin.firestore.FieldValue.serverTimestamp(),
                userId: userId,
            });
        }
        
        await batch.commit();

        revalidatePath('/settings');
        revalidatePath('/');

        return { success: true, message: `Successfully indexed ${file.name}.`, chunks: chunks.length };
    } catch (error) {
        console.error('Error uploading knowledge:', error);
        return { success: false, message: `Failed to index ${file.name}.` };
    }
}
