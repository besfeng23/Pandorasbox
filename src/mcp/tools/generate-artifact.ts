'use server';

import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { GenerateArtifactParams, GenerateArtifactResult } from '../types';
import { FieldValue } from 'firebase-admin/firestore';
import { Artifact } from '@/lib/types';

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
 * Tool handler for generate_artifact
 */
export async function handleGenerateArtifact(
  params: GenerateArtifactParams
): Promise<GenerateArtifactResult> {
  // Validate input
  if (!params.title || typeof params.title !== 'string' || !params.title.trim()) {
    throw new Error('Title parameter is required and must be a non-empty string');
  }
  
  if (!params.type || (params.type !== 'code' && params.type !== 'markdown')) {
    throw new Error('Type parameter must be either "code" or "markdown"');
  }
  
  if (!params.content || typeof params.content !== 'string' || !params.content.trim()) {
    throw new Error('Content parameter is required and must be a non-empty string');
  }
  
  if (!params.user_email || typeof params.user_email !== 'string') {
    throw new Error('user_email parameter is required');
  }
  
  // Map email to UID
  const userId = await getUserUidFromEmail(params.user_email);
  
  // Prepare artifact data
  const artifactType = params.type === 'code' ? 'code' : 'markdown';
  const artifactData: Omit<Artifact, 'id'> = {
    userId: userId,
    title: params.title.trim(),
    type: artifactType,
    content: params.content.trim(),
    version: 1,
    createdAt: FieldValue.serverTimestamp(),
  };
  
  // Store artifact in Firestore
  const firestoreAdmin = getFirestoreAdmin();
  const artifactRef = await firestoreAdmin.collection('artifacts').add(artifactData);
  
  // Track analytics if available
  try {
    const { trackEvent } = await import('@/lib/analytics');
    await trackEvent(userId, 'artifact_created', { artifactType, title: params.title });
  } catch (error) {
    // Analytics is optional, don't fail if it's not available
    console.warn('Could not track analytics:', error);
  }
  
  return {
    success: true,
    artifact_id: artifactRef.id,
    title: params.title.trim(),
  };
}

