/**
 * Centralized memory management utilities
 * 
 * This module ensures ALL memories are automatically saved to the 'memories' collection
 * with proper embeddings and indexing. Use these functions for all memory creation.
 */

'use server';

import { getFirestoreAdmin } from './firebase-admin';
import { generateEmbedding, generateEmbeddingsBatch } from './vector';
import { FieldValue } from 'firebase-admin/firestore';
import { trackEvent } from './analytics';
import { updateKnowledgeGraphFromMemory } from './knowledge-graph';
import { sendKairosEvent } from './kairosClient';
import { sendKairosEvent } from './kairosClient';

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
 * Saves a single memory to the memories collection with automatic embedding generation.
 * This is the standard way to create memories - it ensures proper indexing.
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

    // Create memory document
    const memoryRef = await memoriesCollection.add({
      id: '', // Will be set after creation
      content: memoryData.content.trim(),
      embedding: embedding, // Always include embedding for vector search
      createdAt: FieldValue.serverTimestamp(),
      userId: memoryData.userId,
      source: memoryData.source || 'system', // Track where memory came from
      type: memoryData.type || 'normal', // Memory type: insight, question_to_ask, or normal
      ...memoryData.metadata, // Include any additional metadata
    });

    // Update with the ID
    await memoryRef.update({ id: memoryRef.id });

    // Emit Kairos events
    sendKairosEvent('system.lane.memory.created', {
      memoryId: memoryRef.id,
      userId: memoryData.userId,
    }).catch(err => console.warn('Failed to emit lane.memory.created event:', err));
    
    sendKairosEvent('system.memory.persisted', {
      memoryId: memoryRef.id,
      userId: memoryData.userId,
    }).catch(err => console.warn('Failed to emit memory.persisted event:', err));

    await updateKnowledgeGraphFromMemory({
      userId: memoryData.userId,
      memoryId: memoryRef.id,
      content: memoryData.content.trim(),
    });

    // Phase 5: Periodically capture graph snapshots for temporal analysis
    // Capture snapshot every 10 memories (with some randomness to avoid conflicts)
    try {
      const { captureGraphSnapshot } = await import('./temporal-analysis');
      const snapshotCount = Math.floor(Math.random() * 10);
      if (snapshotCount === 0) {
        // Capture snapshot asynchronously (don't block memory save)
        captureGraphSnapshot(memoryData.userId).catch(err => {
          console.warn('Failed to capture graph snapshot:', err);
        });
      }
    } catch (error) {
      // Snapshot capture is optional
      console.warn('Could not capture graph snapshot:', error);
    }

    // Track analytics
    try {
      await trackEvent(memoryData.userId, 'memory_created', { 
        source: memoryData.source || 'system',
        memory_id: memoryRef.id 
      });
    } catch (error) {
      // Analytics is optional, don't fail if it's not available
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
 * Saves multiple memories in batch with automatic embedding generation.
 * More efficient than saving individually.
 * 
 * @param memories - Array of memory data to save
 * @returns Promise with success status and count
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

    // Filter out invalid memories
    const validMemories = memories.filter(m => 
      m.content && m.content.trim() && m.userId
    );

    if (validMemories.length === 0) {
      return { success: false, saved: 0, failed: memories.length, message: 'No valid memories to save.' };
    }

    const firestoreAdmin = getFirestoreAdmin();
    const memoriesCollection = firestoreAdmin.collection('memories');

    // Generate embeddings in batch for efficiency
    const contents = validMemories.map(m => m.content.trim());
    const embeddings = await generateEmbeddingsBatch(contents);

    // Create batch write
    const batch = firestoreAdmin.batch();
    let saved = 0;
    let failed = 0;
    const savedMemoryIds: string[] = [];

    const knowledgeUpdates: Array<Promise<unknown>> = [];

    for (let i = 0; i < validMemories.length; i++) {
      try {
        const memoryData = validMemories[i];
        const embedding = embeddings[i];
        const docRef = memoriesCollection.doc();

        batch.set(docRef, {
          id: docRef.id,
          content: memoryData.content.trim(),
          embedding: embedding, // Always include embedding for vector search
          createdAt: FieldValue.serverTimestamp(),
          userId: memoryData.userId,
          source: memoryData.source || 'system',
          type: memoryData.type || 'normal', // Memory type: insight, question_to_ask, or normal
          ...memoryData.metadata,
        });

        savedMemoryIds.push(docRef.id);

        knowledgeUpdates.push(
          updateKnowledgeGraphFromMemory({
            userId: memoryData.userId,
            memoryId: docRef.id,
            content: memoryData.content.trim(),
          })
        );

        saved++;
      } catch (error) {
        console.error(`Error preparing memory ${i}:`, error);
        failed++;
      }
    }

    // Commit batch (Firestore limit is 500 operations per batch)
    if (saved > 0) {
      await batch.commit();
      await Promise.all(knowledgeUpdates);
      
      // Emit Kairos events for each saved memory
      const userId = validMemories[0]?.userId;
      if (userId) {
        for (const memoryId of savedMemoryIds) {
          sendKairosEvent('system.lane.memory.created', {
            memoryId,
            userId,
          }).catch(err => console.warn('Failed to emit lane.memory.created event:', err));
          
          sendKairosEvent('system.memory.persisted', {
            memoryId,
            userId,
          }).catch(err => console.warn('Failed to emit memory.persisted event:', err));
        }
      }
      
      // Track analytics
      try {
        if (userId) {
          await trackEvent(userId, 'memory_created', { 
            count: saved,
            source: validMemories[0]?.source || 'system'
          });
        }
      } catch (error) {
        console.warn('Could not track analytics:', error);
      }
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
 * Updates an existing memory and regenerates its embedding.
 * Ensures the memory remains searchable after updates.
 * 
 * @param memoryId - The ID of the memory to update
 * @param newContent - The new content for the memory
 * @param userId - The user ID (for permission check)
 * @returns Promise with success status
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

    // Regenerate embedding for updated content
    const newEmbedding = await generateEmbedding(newContent.trim());

    // Update memory with new content and embedding
    await docRef.update({
      content: newContent.trim(),
      embedding: newEmbedding, // Always update embedding when content changes
      editedAt: FieldValue.serverTimestamp(),
    });

    await updateKnowledgeGraphFromMemory({
      userId,
      memoryId,
      content: newContent.trim(),
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

/**
 * Helper function to save an insight memory with proper type and metadata.
 * This ensures insights are properly tagged for prioritization in search.
 * 
 * @param insight - The insight content to save
 * @param userId - The user ID
 * @param metadata - Additional metadata (reflectionDate, processedCount, etc.)
 * @returns Promise with success status and memory ID
 */
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

/**
 * Helper function to save a question memory with proper type and metadata.
 * These are questions the AI should ask the user based on weak answers identified.
 * 
 * @param question - The question content to save
 * @param userId - The user ID
 * @param topic - The topic the question relates to
 * @param metadata - Additional metadata
 * @returns Promise with success status and memory ID
 */
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
