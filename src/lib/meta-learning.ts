'use server';

/**
 * Phase 6: Continuous Self-Improvement & Meta-Learning
 * 
 * This module enables the system to learn from past interactions and continuously
 * improve its performance through adaptive weight adjustment and strategy optimization.
 */

import { getFirestoreAdmin } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export interface PerformanceMetric {
  query: string;
  userId: string;
  timestamp: Date;
  internalCount: number;
  externalCount: number;
  avgConfidence: number;
  avgFusedScore: number;
  userSatisfaction?: number; // 0-1 scale, from feedback
  responseTime: number; // milliseconds
  resultQuality?: 'high' | 'medium' | 'low'; // Determined by user feedback or heuristics
}

export interface MetaLearningState {
  userId: string;
  internalWeight: number; // Current weight for internal results (default: 0.6)
  externalWeight: number; // Current weight for external results (default: 0.4)
  learningRate: number; // How fast to adapt (default: 0.01)
  totalQueries: number;
  avgSatisfaction: number;
  lastUpdated: Date;
  strategy: 'conservative' | 'balanced' | 'aggressive'; // Learning strategy
}

export interface FeedbackData {
  query: string;
  userId: string;
  resultIds: string[]; // IDs of results that were useful
  satisfaction: number; // 0-1 scale
  feedback?: string; // Optional text feedback
  timestamp: Date;
}

/**
 * Records a performance metric for meta-learning analysis.
 */
export async function recordPerformanceMetric(
  metric: PerformanceMetric
): Promise<void> {
  const firestoreAdmin = getFirestoreAdmin();
  const metricsCollection = firestoreAdmin.collection('performance_metrics');

  await metricsCollection.add({
    ...metric,
    timestamp: FieldValue.serverTimestamp(),
  });

  console.log(`[meta-learning] Recorded performance metric for user ${metric.userId}`);
}

/**
 * Records user feedback for a search query.
 */
export async function recordFeedback(
  feedback: FeedbackData
): Promise<void> {
  const firestoreAdmin = getFirestoreAdmin();
  const feedbackCollection = firestoreAdmin.collection('feedback');

  await feedbackCollection.add({
    ...feedback,
    timestamp: FieldValue.serverTimestamp(),
  });

  // Update user's meta-learning state based on feedback
  await updateMetaLearningState(feedback.userId, feedback.satisfaction);

  console.log(`[meta-learning] Recorded feedback from user ${feedback.userId} (satisfaction: ${feedback.satisfaction})`);
}

/**
 * Gets or creates meta-learning state for a user.
 */
export async function getMetaLearningState(
  userId: string
): Promise<MetaLearningState> {
  const firestoreAdmin = getFirestoreAdmin();
  const stateDoc = firestoreAdmin
    .collection('meta_learning_state')
    .doc(userId);

  const snapshot = await stateDoc.get();

  if (snapshot.exists) {
    const data = snapshot.data()!;
    return {
      userId: data.userId,
      internalWeight: data.internalWeight || 0.6,
      externalWeight: data.externalWeight || 0.4,
      learningRate: data.learningRate || 0.01,
      totalQueries: data.totalQueries || 0,
      avgSatisfaction: data.avgSatisfaction || 0.5,
      lastUpdated: (data.lastUpdated as Timestamp).toDate(),
      strategy: data.strategy || 'balanced',
    };
  }

  // Create default state
  const defaultState: MetaLearningState = {
    userId,
    internalWeight: 0.6,
    externalWeight: 0.4,
    learningRate: 0.01,
    totalQueries: 0,
    avgSatisfaction: 0.5,
    lastUpdated: new Date(),
    strategy: 'balanced',
  };

  await stateDoc.set({
    ...defaultState,
    lastUpdated: FieldValue.serverTimestamp(),
  });

  return defaultState;
}

/**
 * Updates meta-learning state based on new feedback.
 * Uses gradient descent-like approach to adjust weights.
 */
async function updateMetaLearningState(
  userId: string,
  satisfaction: number
): Promise<void> {
  const state = await getMetaLearningState(userId);
  const firestoreAdmin = getFirestoreAdmin();
  const stateDoc = firestoreAdmin
    .collection('meta_learning_state')
    .doc(userId);

  // Calculate new average satisfaction (exponential moving average)
  const alpha = 0.1; // Smoothing factor
  const newAvgSatisfaction =
    state.avgSatisfaction * (1 - alpha) + satisfaction * alpha;

  // Adjust weights based on satisfaction
  // If satisfaction is high, we're doing well - make smaller adjustments
  // If satisfaction is low, we need bigger adjustments
  const adjustmentFactor = (satisfaction - state.avgSatisfaction) * state.learningRate;

  let newInternalWeight = state.internalWeight;
  let newExternalWeight = state.externalWeight;

  // Adjust weights based on feedback
  // If satisfaction increased, we might want to shift toward what worked
  // If satisfaction decreased, we should explore different weight combinations
  if (satisfaction > state.avgSatisfaction) {
    // Positive feedback - make conservative adjustments toward current weights
    newInternalWeight = Math.max(0.3, Math.min(0.8, state.internalWeight + adjustmentFactor * 0.1));
  } else {
    // Negative feedback - explore by adjusting away from current weights
    newInternalWeight = Math.max(0.3, Math.min(0.8, state.internalWeight - adjustmentFactor * 0.2));
  }

  // Ensure weights sum to 1.0
  const totalWeight = newInternalWeight + state.externalWeight;
  if (totalWeight !== 1.0) {
    newInternalWeight = newInternalWeight / totalWeight;
    newExternalWeight = 1.0 - newInternalWeight;
  } else {
    newExternalWeight = state.externalWeight;
  }

  // Update learning rate based on performance (adaptive learning rate)
  let newLearningRate = state.learningRate;
  if (Math.abs(satisfaction - state.avgSatisfaction) < 0.05) {
    // Stable performance - reduce learning rate
    newLearningRate = Math.max(0.005, state.learningRate * 0.95);
  } else {
    // Volatile performance - increase learning rate slightly
    newLearningRate = Math.min(0.05, state.learningRate * 1.05);
  }

  // Determine strategy based on performance
  let newStrategy: MetaLearningState['strategy'] = state.strategy;
  if (newAvgSatisfaction > 0.8) {
    newStrategy = 'conservative'; // Doing well, be conservative
  } else if (newAvgSatisfaction > 0.6) {
    newStrategy = 'balanced'; // Good performance, stay balanced
  } else {
    newStrategy = 'aggressive'; // Need improvement, be more aggressive
  }

  await stateDoc.update({
    internalWeight: newInternalWeight,
    externalWeight: newExternalWeight,
    learningRate: newLearningRate,
    totalQueries: FieldValue.increment(1),
    avgSatisfaction: newAvgSatisfaction,
    strategy: newStrategy,
    lastUpdated: FieldValue.serverTimestamp(),
  });

  console.log(
    `[meta-learning] Updated state for user ${userId}: ` +
    `weights(${newInternalWeight.toFixed(3)}, ${newExternalWeight.toFixed(3)}), ` +
    `satisfaction=${newAvgSatisfaction.toFixed(3)}, strategy=${newStrategy}`
  );
}

/**
 * Analyzes performance metrics to identify patterns and suggest improvements.
 */
export async function analyzePerformanceMetrics(
  userId: string,
  daysBack: number = 7
): Promise<{
  avgSatisfaction: number;
  avgResponseTime: number;
  optimalWeights?: { internal: number; external: number };
  recommendations: string[];
}> {
  const firestoreAdmin = getFirestoreAdmin();
  const metricsCollection = firestoreAdmin.collection('performance_metrics');
  const cutoffDate = Timestamp.fromDate(
    new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
  );

  const snapshot = await metricsCollection
    .where('userId', '==', userId)
    .where('timestamp', '>=', cutoffDate)
    .orderBy('timestamp', 'desc')
    .limit(100)
    .get();

  if (snapshot.empty) {
    return {
      avgSatisfaction: 0.5,
      avgResponseTime: 0,
      recommendations: ['No performance data available yet. Keep using the system to generate metrics.'],
    };
  }

  let totalSatisfaction = 0;
  let satisfactionCount = 0;
  let totalResponseTime = 0;
  const weightsMap = new Map<string, { count: number; satisfaction: number }>();

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (data.userSatisfaction !== undefined) {
      totalSatisfaction += data.userSatisfaction;
      satisfactionCount++;
    }
    if (data.responseTime) {
      totalResponseTime += data.responseTime;
    }

    // Track which weight combinations worked best
    const weightKey = `${data.internalWeight?.toFixed(2) || '0.60'}_${data.externalWeight?.toFixed(2) || '0.40'}`;
    const existing = weightsMap.get(weightKey) || { count: 0, satisfaction: 0 };
    existing.count++;
    if (data.userSatisfaction) {
      existing.satisfaction += data.userSatisfaction;
    }
    weightsMap.set(weightKey, existing);
  });

  const avgSatisfaction = satisfactionCount > 0 ? totalSatisfaction / satisfactionCount : 0.5;
  const avgResponseTime = snapshot.size > 0 ? totalResponseTime / snapshot.size : 0;

  // Find optimal weights based on highest average satisfaction
  let optimalWeights: { internal: number; external: number } | undefined;
  let bestSatisfaction = 0;

  weightsMap.forEach((value, key) => {
    const avgSat = value.count > 0 ? value.satisfaction / value.count : 0;
    if (avgSat > bestSatisfaction && value.count >= 3) {
      bestSatisfaction = avgSat;
      const [internal, external] = key.split('_').map(parseFloat);
      optimalWeights = { internal, external };
    }
  });

  // Generate recommendations
  const recommendations: string[] = [];
  if (avgSatisfaction < 0.6) {
    recommendations.push('Consider adjusting hybrid search weights. Current performance is below optimal.');
  }
  if (avgResponseTime > 2000) {
    recommendations.push('Response times are high. Consider optimizing search queries or using more cached results.');
  }
  if (optimalWeights && Math.abs(optimalWeights.internal - 0.6) > 0.1) {
    recommendations.push(
      `Optimal weights appear to be ${(optimalWeights.internal * 100).toFixed(0)}% internal, ` +
      `${(optimalWeights.external * 100).toFixed(0)}% external based on recent performance.`
    );
  }
  if (recommendations.length === 0) {
    recommendations.push('Performance is optimal. Keep up the good work!');
  }

  return {
    avgSatisfaction,
    avgResponseTime,
    optimalWeights,
    recommendations,
  };
}

/**
 * Performs batch learning from recent feedback to update user states.
 */
export async function performBatchLearning(
  userId?: string
): Promise<{ usersUpdated: number; avgSatisfactionChange: number }> {
  const firestoreAdmin = getFirestoreAdmin();
  const feedbackCollection = firestoreAdmin.collection('feedback');
  const cutoffDate = Timestamp.fromDate(new Date(Date.now() - 24 * 60 * 60 * 1000)); // Last 24 hours

  let query = feedbackCollection
    .where('timestamp', '>=', cutoffDate)
    .orderBy('timestamp', 'desc');

  if (userId) {
    query = query.where('userId', '==', userId) as any;
  }

  const snapshot = await query.limit(100).get();

  if (snapshot.empty) {
    return { usersUpdated: 0, avgSatisfactionChange: 0 };
  }

  const userStates = new Map<string, { count: number; totalSatisfaction: number; previousSatisfaction: number }>();

  // Group feedback by user
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const uid = data.userId;
    const state = await getMetaLearningState(uid);
    const existing = userStates.get(uid) || {
      count: 0,
      totalSatisfaction: 0,
      previousSatisfaction: state.avgSatisfaction,
    };
    existing.count++;
    existing.totalSatisfaction += data.satisfaction || 0.5;
    userStates.set(uid, existing);
  }

  // Update each user's state
  let usersUpdated = 0;
  let totalSatisfactionChange = 0;

  for (const [uid, stats] of userStates.entries()) {
    const avgSatisfaction = stats.totalSatisfaction / stats.count;
    await updateMetaLearningState(uid, avgSatisfaction);
    usersUpdated++;
    totalSatisfactionChange += avgSatisfaction - stats.previousSatisfaction;
  }

  const avgSatisfactionChange = usersUpdated > 0 ? totalSatisfactionChange / usersUpdated : 0;

  console.log(
    `[meta-learning] Batch learning complete: ${usersUpdated} users updated, ` +
    `avg satisfaction change: ${avgSatisfactionChange.toFixed(3)}`
  );

  return { usersUpdated, avgSatisfactionChange };
}

