import { getAuthAdmin } from '@/lib/firebase-admin';
import { AddMemoryParams, AddMemoryResult } from '../types';

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
  
  // Use centralized memory utility to ensure automatic indexing
  const { saveMemory } = await import('@/lib/memory-utils');
  
  const result = await saveMemory({
    content: params.memory.trim(),
    userId: userId,
    source: 'mcp',
  });
  
  if (!result.success) {
    throw new Error(result.message || 'Failed to save memory');
  }
  
  return {
    success: true,
    memory_id: result.memory_id!,
    user_id: userId,
  };
}

