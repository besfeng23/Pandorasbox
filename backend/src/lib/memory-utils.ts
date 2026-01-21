/**
 * Centralized memory management utilities
 * 
 * This module ensures ALL memories are automatically saved to the 'memories' collection
 * in Firestore AND to Qdrant for vector search.
 * Use these functions for all memory creation.
 */

'use server';

import { getFirestoreAdmin } from './firebase-admin';
import { generateEmbedding, generateEmbeddingsBatch } from './vector';
import { FieldValue } from 'firebase-admin/firestore';
import { trackEvent } from './analytics';
import { upsertPoint } from './sovereign/qdrant-client';

export interface MemoryData {
  content: string;
  userId: string;
  source?: string;
  metadata?: Record<string, any>;
  type?: 'insight' | 'question_to_ask' | 'normal';
}

export interface MemoryResult {
  success: boolean;
  memory_id?: string;
  message?: string;
}

/**
 * Saves a single memory to Firestore AND Qdrant with automatic embedding generation.
 * 
 * @param memoryData - The memory data to save
 * @returns Promise with success status and memory ID
 */
export async function saveMemory(memoryData: MemoryData): Promise<MemoryResult> {
  try {
    if (!memoryData.content || !memoryData.content.trim()) {
      return { success: false, message: 'Memory content cannot be empty.' };
    }

    if (!memoryData.userId) {
      return { success: false, message: 'User ID is required.' };
    }

    const firestoreAdmin = getFirestoreAdmin();
    const memoriesCollection = firestoreAdmin.collection('memories');

    // Generate embedding automatically
    const embedding = await generateEmbedding(memoryData.content.trim());

    // Create memory document in Firestore
    const memoryRef = await memoriesCollection.add({
      id: '', // Will be set after creation
      content: memoryData.content.trim(),
      embedding: embedding,
      createdAt: FieldValue.serverTimestamp(),
      userId: memoryData.userId,
      source: memoryData.source || 'system',
      type: memoryData.type || 'normal',
      ...memoryData.metadata,
    });

    // Update with the ID
    await memoryRef.update({ id: memoryRef.id });

    // --- Qdrant Integration ---
    try {
      const collectionName = `memories_${memoryData.userId}`;
      
      await upsertPoint(collectionName, {
        id: memoryRef.id,
        vector: embedding,
        payload: {
          content: memoryData.content.trim(),
          userId: memoryData.userId,
          source: memoryData.source || 'system',
          type: memoryData.type || 'normal',
          createdAt: new Date().toISOString(),
          ...memoryData.metadata
        }
      });
    } catch (qdrantError) {
      console.warn('Memory saved to Firestore but Qdrant upsert failed:', qdrantError);
    }

    // Track analytics
    try {
      await trackEvent(memoryData.userId, 'memory_created', { 
        source: memoryData.source || 'system',
        memory_id: memoryRef.id 
      });
    } catch (error) {
      console.warn('Could not track analytics:', error);
    }

    return {
      success: true,
      memory_id: memoryRef.id,
      message: 'Memory saved successfully.',
    };
  } catch (error: any) {
    console.error('Error saving memory:', error);
    return {
      success: false,
      message: `Failed to save memory: ${error.message || 'Unknown error'}`,
    };
  }
}

/**
 * Saves multiple memories in batch to Firestore and Qdrant.
 */
export async function saveMemoriesBatch(memories: MemoryData[]): Promise<{
  success: boolean;
  saved: number;
  failed: number;
  message?: string;
}> {
  try {
    if (!memories || memories.length === 0) {
      return { success: true, saved: 0, failed: 0, message: 'No memories to save.' };
    }

    const validMemories = memories.filter(m => 
      m.content && m.content.trim() && m.userId
    );

    if (validMemories.length === 0) {
      return { success: false, saved: 0, failed: memories.length, message: 'No valid memories to save.' };
    }

    const firestoreAdmin = getFirestoreAdmin();
    const memoriesCollection = firestoreAdmin.collection('memories');

    // Generate embeddings in batch
    const contents = validMemories.map(m => m.content.trim());
    const embeddings = await generateEmbeddingsBatch(contents);

    const batch = firestoreAdmin.batch();
    let saved = 0;
    let failed = 0;

    for (let i = 0; i < validMemories.length; i++) {
      try {
        const memoryData = validMemories[i];
        const embedding = embeddings[i];
        const docRef = memoriesCollection.doc();

        const data = {
          id: docRef.id,
          content: memoryData.content.trim(),
          embedding: embedding,
          createdAt: FieldValue.serverTimestamp(),
          userId: memoryData.userId,
          source: memoryData.source || 'system',
          type: memoryData.type || 'normal',
          ...memoryData.metadata,
        };

        batch.set(docRef, data);
        
        // --- Individual Qdrant Upsert (Batch upsert would be better if Qdrant client supported it) ---
        const collectionName = `memories_${memoryData.userId}`;
        await upsertPoint(collectionName, {
          id: docRef.id,
          vector: embedding,
          payload: {
            ...data,
            createdAt: new Date().toISOString(),
            embedding: undefined // Don't duplicate vector in payload
          }
        });

        saved++;
      } catch (error) {
        console.error(`Error processing memory ${i} for batch:`, error);
        failed++;
      }
    }

    if (saved > 0) {
      await batch.commit();
    }

    return {
      success: saved > 0,
      saved,
      failed: failed + (memories.length - validMemories.length),
      message: `Saved ${saved} memories. ${failed} failed.`,
    };
  } catch (error: any) {
    console.error('Error saving memories batch:', error);
    return {
      success: false,
      saved: 0,
      failed: memories.length,
      message: `Failed to save memories: ${error.message || 'Unknown error'}`,
    };
  }
}

/**
 * Updates an existing memory in Firestore and Qdrant.
 */
export async function updateMemoryWithEmbedding(
  memoryId: string,
  newContent: string,
  userId: string
): Promise<MemoryResult> {
  try {
    if (!newContent || !newContent.trim()) {
      return { success: false, message: 'Memory content cannot be empty.' };
    }

    const firestoreAdmin = getFirestoreAdmin();
    const docRef = firestoreAdmin.collection('memories').doc(memoryId);
    const docSnap = await docRef.get();

    if (!docSnap.exists || docSnap.data()?.userId !== userId) {
      return { success: false, message: 'Permission denied or memory not found.' };
    }

    const data = docSnap.data();
    const newEmbedding = await generateEmbedding(newContent.trim());

    // Update Firestore
    await docRef.update({
      content: newContent.trim(),
      embedding: newEmbedding,
      editedAt: FieldValue.serverTimestamp(),
    });

    // Update Qdrant
    const collectionName = `memories_${userId}`;
    await upsertPoint(collectionName, {
      id: memoryId,
      vector: newEmbedding,
      payload: {
        content: newContent.trim(),
        userId,
        source: data?.source,
        type: data?.type,
        updatedAt: new Date().toISOString()
      }
    });

    return {
      success: true,
      memory_id: memoryId,
      message: 'Memory updated successfully.',
    };
  } catch (error: any) {
    console.error('Error updating memory:', error);
    return {
      success: false,
      message: `Failed to update memory: ${error.message || 'Unknown error'}`,
    };
  }
}

export async function saveInsightMemory(
  insight: string,
  userId: string,
  metadata?: Record<string, any>
): Promise<MemoryResult> {
  return saveMemory({
    content: insight,
    userId: userId,
    source: 'reflection',
    type: 'insight',
    metadata: metadata,
  });
}

export async function saveQuestionMemory(
  question: string,
  userId: string,
  topic: string,
  metadata?: Record<string, any>
): Promise<MemoryResult> {
  const content = `Topic: ${topic}\n\nQuestion to ask user: ${question}`;
  return saveMemory({
    content: content,
    userId: userId,
    source: 'reflection',
    type: 'question_to_ask',
    metadata: {
      weakAnswerTopic: topic,
      ...metadata,
    },
  });
}
