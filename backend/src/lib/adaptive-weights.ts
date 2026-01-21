'use server';

/**
 * Phase 6: Adaptive Weights System
 * 
 * Dynamically adjusts hybrid search weights based on user performance and feedback.
 */

import { getMetaLearningState, MetaLearningState } from './meta-learning';

export interface AdaptiveWeights {
  internal: number;
  external: number;
  source: 'default' | 'learned' | 'optimized';
  confidence: number; // How confident we are in these weights (0-1)
}

/**
 * Gets adaptive weights for a user's hybrid search.
 * Uses meta-learning state to determine optimal weights.
 */
export async function getAdaptiveWeights(
  userId: string
): Promise<AdaptiveWeights> {
  const state = await getMetaLearningState(userId);

  // Determine confidence based on number of queries and satisfaction variance
  let confidence = 0.5; // Default confidence
  if (state.totalQueries > 50) {
    confidence = Math.min(0.95, 0.5 + (state.totalQueries / 1000) * 0.5);
  }

  // If we have good performance and stable satisfaction, increase confidence
  if (state.avgSatisfaction > 0.7 && state.totalQueries > 20) {
    confidence = Math.min(0.95, confidence + 0.2);
  }

  // Determine source
  let source: AdaptiveWeights['source'] = 'default';
  if (state.totalQueries > 10) {
    source = 'learned';
  }
  if (state.totalQueries > 50 && state.avgSatisfaction > 0.7) {
    source = 'optimized';
  }

  return {
    internal: state.internalWeight,
    external: state.externalWeight,
    source,
    confidence,
  };
}

/**
 * Gets weights with fallback strategy based on learning state.
 */
export async function getWeightsWithFallback(
  userId: string,
  defaultInternal: number = 0.6,
  defaultExternal: number = 0.4
): Promise<{ internal: number; external: number }> {
  try {
    const adaptive = await getAdaptiveWeights(userId);

    // Use learned weights if confidence is high enough
    if (adaptive.confidence > 0.6) {
      return {
        internal: adaptive.internal,
        external: adaptive.external,
      };
    }

    // Fall back to defaults if confidence is low
    return {
      internal: defaultInternal,
      external: defaultExternal,
    };
  } catch (error) {
    console.error('[adaptive-weights] Error getting adaptive weights, using defaults:', error);
    return {
      internal: defaultInternal,
      external: defaultExternal,
    };
  }
}

/**
 * Forces weight reset for a user (useful for testing or when performance degrades).
 */
export async function resetUserWeights(userId: string): Promise<void> {
  const { getFirestoreAdmin } = await import('./firebase-admin');
  const { FieldValue } = await import('firebase-admin/firestore');
  const firestoreAdmin = getFirestoreAdmin();
  const stateDoc = firestoreAdmin.collection('meta_learning_state').doc(userId);

  await stateDoc.update({
    internalWeight: 0.6,
    externalWeight: 0.4,
    learningRate: 0.01,
    avgSatisfaction: 0.5,
    strategy: 'balanced',
    lastUpdated: FieldValue.serverTimestamp(),
  });

  console.log(`[adaptive-weights] Reset weights for user ${userId} to defaults`);
}

