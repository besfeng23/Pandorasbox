'use server';

import { firestoreAdmin, admin } from '@/lib/firebase-admin';
import { generateEmbedding, searchHistory } from '@/lib/vector';
import { revalidatePath } from 'next/cache';
import { SearchResult } from '@/lib/types';
import { getStorage } from 'firebase-admin/storage';
import { getDownloadURL } from 'firebase-admin/storage';
import OpenAI from 'openai';
import pdf from 'pdf-parse';
import { chunkText } from '@/lib/chunking';
import { runChatLane } from '@/ai/flows/run-chat-lane';

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
    return;
  }

  if ((!messageContent || !messageContent.trim()) && !imageBase64) {
    return;
  }

  const historyCollection = firestoreAdmin.collection('users').doc(userId).collection('history');
  
  const userMessageRef = historyCollection.doc();
  const userMessageId = userMessageRef.id;

  let imageUrl: string | undefined = undefined;

  try {
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
    }
    
    const embedding = await generateEmbedding(messageContent || 'image');

    // Save user message to Firestore.
    await userMessageRef.set({
        id: userMessageId,
        role: 'user',
        content: messageContent,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: userId,
        imageUrl: imageUrl ?? null,
        source: source,
        embedding: embedding,
    });
    console.log('Successfully wrote user message to history for user:', userId);

    // Trigger the unified chat lane flow.
    await runChatLane({ 
      userId, 
      message: messageContent,
      imageBase64: imageBase64,
      source: source
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
    const historyCollectionRef = firestoreAdmin.collection('users').doc(userId).collection('history');
    const memoriesCollectionRef = firestoreAdmin.collection('users').doc(userId).collection('memories');
    const stateCollectionRef = firestoreAdmin.collection('users').doc(userId).collection('state');

    try {
        const historySnapshot = await historyCollectionRef.get();
        const historyBatch = firestoreAdmin.batch();
        historySnapshot.docs.forEach(doc => {
            historyBatch.delete(doc.ref);
        });
        await historyBatch.commit();

        const memoriesSnapshot = await memoriesCollectionRef.get();
        const memoriesBatch = firestoreAdmin.batch();
        memoriesSnapshot.docs.forEach(doc => {
            memoriesBatch.delete(doc.ref);
        });
        await memoriesBatch.commit();

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
  
    const historyCollection = firestoreAdmin
      .collection('users')
      .doc(userId)
      .collection('history');
  
    if (query && query.trim()) {
      const searchResults = await searchHistory(query, userId);
      // We need to fetch the full documents
      if (searchResults.length === 0) return [];
      const docIds = searchResults.map(r => r.id);
      const memoryDocs = await historyCollection.where(admin.firestore.FieldPath.documentId(), 'in', docIds).get();
      return memoryDocs.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } else {
      const snapshot = await historyCollection
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
      await firestoreAdmin
        .collection('users')
        .doc(userId)
        .collection('history')
        .doc(id)
        .delete();
      revalidatePath('/settings');
      return { success: true };
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
        const newEmbedding = await generateEmbedding(newText);
        await firestoreAdmin
        .collection('users')
        .doc(userId)
        .collection('history')
        .doc(id)
        .update({
            content: newText,
            embedding: newEmbedding,
            editedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        revalidatePath('/settings');
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
        const historyCollection = firestoreAdmin.collection('users').doc(userId).collection('history');
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

        return { success: true, message: `Successfully indexed ${file.name}.`, chunks: chunks.length };
    } catch (error) {
        console.error('Error uploading knowledge:', error);
        return { success: false, message: `Failed to index ${file.name}.` };
    }
}
