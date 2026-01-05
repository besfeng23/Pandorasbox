'use server';

import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { generateEmbedding } from '@/lib/vector';
import { AddMemoryParams, AddMemoryResult } from '../types';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Maps user email to Firebase UID
 */
async function getUserUidFromEmail(email: string): Promise<string> {
  const authAdmin = getAuthAdmin();
  try {
    const user = await authAdmin.getUserByEmail(email);
    return user.uid;
  } catch (error: any) {
    if (error.code === 'auth/user-not-found') {
      throw new Error(`User with email ${email} not found. Please ensure the user account exists in Firebase.`);
    }
    throw error;
  }
}

/**
 * Tool handler for add_memory
 */
export async function handleAddMemory(
  params: AddMemoryParams
): Promise<AddMemoryResult> {
  // Validate input
  if (!params.memory || typeof params.memory !== 'string' || !params.memory.trim()) {
    throw new Error('Memory parameter is required and must be a non-empty string');
  }
  
  if (!params.user_email || typeof params.user_email !== 'string') {
    throw new Error('user_email parameter is required');
  }
  
  // Map email to UID
  const userId = await getUserUidFromEmail(params.user_email);
  
  // Generate embedding
  const embedding = await generateEmbedding(params.memory.trim());
  
  // Store memory in Firestore
  const firestoreAdmin = getFirestoreAdmin();
  const memoriesCollection = firestoreAdmin.collection('memories');
  
  const memoryRef = await memoriesCollection.add({
    id: '', // Will be set after creation
    content: params.memory.trim(),
    embedding: embedding,
    createdAt: FieldValue.serverTimestamp(),
    userId: userId,
    source: 'mcp', // Mark as coming from MCP
  });
  
  // Update with the ID
  await memoryRef.update({ id: memoryRef.id });
  
  // Track analytics if available
  try {
    const { trackEvent } = await import('@/lib/analytics');
    await trackEvent(userId, 'memory_created', { source: 'mcp' });
  } catch (error) {
    // Analytics is optional, don't fail if it's not available
    console.warn('Could not track analytics:', error);
  }
  
  return {
    success: true,
    memory_id: memoryRef.id,
    user_id: userId,
  };
}

