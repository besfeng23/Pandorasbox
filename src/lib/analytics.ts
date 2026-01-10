'use server';

import { getFirestoreAdmin } from './firebase-admin';

/**
 * Track user activity for analytics
 * Uses Cloud Run structured logging to sink to BigQuery
 */
export async function trackEvent(
  userId: string,
  eventType: 'message_sent' | 'embedding_generated' | 'memory_created' | 'memories_created_batch' | 'artifact_created' | 'knowledge_uploaded',
  metadata?: Record<string, any>
): Promise<void> {
  // Structured logging for BigQuery Sink
  console.log(JSON.stringify({
    type: "analytics_event",
    event: eventType,
    userId: userId,
    timestamp: new Date().toISOString(),
    ...metadata
  }));
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
    // Note: embeddingsGenerated will stop incrementing in Firestore as we moved to BigQuery logging
    // We keep the query for historical data or until we implement BigQuery reading
    const [messagesSnapshot, memoriesSnapshot, artifactsSnapshot] = await Promise.all([
      firestoreAdmin.collection('history').where('userId', '==', userId).count().get(),
      firestoreAdmin.collection('memories').where('userId', '==', userId).count().get(),
      firestoreAdmin.collection('artifacts').where('userId', '==', userId).count().get(),
    ]);

    return {
      totalMessages: messagesSnapshot.data().count,
      totalMemories: memoriesSnapshot.data().count,
      totalArtifacts: artifactsSnapshot.data().count,
      embeddingsGenerated: 0, // Deprecated in Firestore
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
