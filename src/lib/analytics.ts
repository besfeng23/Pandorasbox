'use server';

import { getFirestoreAdmin } from './firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Track user activity for analytics
 */
export async function trackEvent(
  userId: string,
  eventType: 'message_sent' | 'embedding_generated' | 'memory_created' | 'artifact_created' | 'knowledge_uploaded',
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const firestoreAdmin = getFirestoreAdmin();
    await firestoreAdmin.collection('analytics').add({
      userId,
      eventType,
      metadata: metadata || {},
      timestamp: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    // Fail silently - analytics shouldn't break the app
    console.error('Analytics tracking failed:', error);
  }
}

/**
 * Get usage statistics for a user
 */
export async function getUserStats(userId: string): Promise<{
  totalMessages: number;
  totalMemories: number;
  totalArtifacts: number;
  embeddingsGenerated: number;
}> {
  const firestoreAdmin = getFirestoreAdmin();
  
  try {
    const [messagesSnapshot, memoriesSnapshot, artifactsSnapshot, analyticsSnapshot] = await Promise.all([
      firestoreAdmin.collection('history').where('userId', '==', userId).count().get(),
      firestoreAdmin.collection('memories').where('userId', '==', userId).count().get(),
      firestoreAdmin.collection('artifacts').where('userId', '==', userId).count().get(),
      firestoreAdmin.collection('analytics')
        .where('userId', '==', userId)
        .where('eventType', '==', 'embedding_generated')
        .count()
        .get(),
    ]);

    return {
      totalMessages: messagesSnapshot.data().count,
      totalMemories: memoriesSnapshot.data().count,
      totalArtifacts: artifactsSnapshot.data().count,
      embeddingsGenerated: analyticsSnapshot.data().count,
    };
  } catch (error) {
    console.error('Error fetching user stats:', error);
    return {
      totalMessages: 0,
      totalMemories: 0,
      totalArtifacts: 0,
      embeddingsGenerated: 0,
    };
  }
}

