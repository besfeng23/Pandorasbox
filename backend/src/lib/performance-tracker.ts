'use server';

/**
 * Phase 6: Performance Tracking
 * 
 * Tracks search performance metrics over time to enable meta-learning.
 */

import { getFirestoreAdmin } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { PerformanceMetric } from './meta-learning';

export interface SearchPerformance {
  query: string;
  userId: string;
  internalCount: number;
  externalCount: number;
  avgConfidence: number;
  avgFusedScore: number;
  responseTime: number; // milliseconds
  userSatisfaction?: number; // Optional immediate satisfaction rating
  weights?: {
    internal: number;
    external: number;
  };
}

/**
 * Tracks a search performance metric.
 */
export async function trackSearchPerformance(
  performance: SearchPerformance
): Promise<void> {
  const metric: PerformanceMetric = {
    query: performance.query,
    userId: performance.userId,
    timestamp: new Date(),
    internalCount: performance.internalCount,
    externalCount: performance.externalCount,
    avgConfidence: performance.avgConfidence,
    avgFusedScore: performance.avgFusedScore,
    responseTime: performance.responseTime,
    userSatisfaction: performance.userSatisfaction,
    resultQuality: determineResultQuality(performance),
  };

  // Phase 6 Scalability: Log to stdout for Cloud Logging/BigQuery ingestion instead of Firestore
  console.log(JSON.stringify({
    severity: 'INFO',
    message: 'Performance Metric',
    type: 'performance_metric',
    ...metric
  }));
}

/**
 * Determines result quality based on heuristics.
 */
function determineResultQuality(
  performance: SearchPerformance
): 'high' | 'medium' | 'low' {
  // High quality: good confidence, reasonable results count, good fused score
  if (
    performance.avgConfidence > 0.7 &&
    (performance.internalCount + performance.externalCount) >= 3 &&
    performance.avgFusedScore > 0.5
  ) {
    return 'high';
  }

  // Low quality: poor confidence, few results, low fused score
  if (
    performance.avgConfidence < 0.4 ||
    (performance.internalCount + performance.externalCount) < 2 ||
    performance.avgFusedScore < 0.3
  ) {
    return 'low';
  }

  return 'medium';
}

/**
 * Gets performance statistics for a user over a time period.
 */
export async function getUserPerformanceStats(
  userId: string,
  daysBack: number = 7
): Promise<{
  totalSearches: number;
  avgConfidence: number;
  avgResponseTime: number;
  avgSatisfaction: number;
  qualityDistribution: { high: number; medium: number; low: number };
}> {
  const firestoreAdmin = getFirestoreAdmin();
  const cutoffDate = Timestamp.fromDate(
    new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
  );

  const snapshot = await firestoreAdmin
    .collection('performance_metrics')
    .where('userId', '==', userId)
    .where('timestamp', '>=', cutoffDate)
    .orderBy('timestamp', 'desc')
    .limit(100)
    .get();

  if (snapshot.empty) {
    return {
      totalSearches: 0,
      avgConfidence: 0,
      avgResponseTime: 0,
      avgSatisfaction: 0,
      qualityDistribution: { high: 0, medium: 0, low: 0 },
    };
  }

  let totalConfidence = 0;
  let totalResponseTime = 0;
  let totalSatisfaction = 0;
  let satisfactionCount = 0;
  const qualityDistribution = { high: 0, medium: 0, low: 0 };

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    totalConfidence += data.avgConfidence || 0;
    totalResponseTime += data.responseTime || 0;

    if (data.userSatisfaction !== undefined) {
      totalSatisfaction += data.userSatisfaction;
      satisfactionCount++;
    }

    const quality = (data.resultQuality as 'high' | 'medium' | 'low') || 'medium';
    qualityDistribution[quality]++;
  });

  const count = snapshot.size;

  return {
    totalSearches: count,
    avgConfidence: count > 0 ? totalConfidence / count : 0,
    avgResponseTime: count > 0 ? totalResponseTime / count : 0,
    avgSatisfaction: satisfactionCount > 0 ? totalSatisfaction / satisfactionCount : 0,
    qualityDistribution,
  };
}

/**
 * Tracks overall system performance across all users.
 */
export async function getSystemPerformanceStats(
  daysBack: number = 7
): Promise<{
  totalSearches: number;
  uniqueUsers: number;
  avgConfidence: number;
  avgResponseTime: number;
  avgSatisfaction: number;
}> {
  const firestoreAdmin = getFirestoreAdmin();
  const cutoffDate = Timestamp.fromDate(
    new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
  );

  const snapshot = await firestoreAdmin
    .collection('performance_metrics')
    .where('timestamp', '>=', cutoffDate)
    .limit(1000)
    .get();

  if (snapshot.empty) {
    return {
      totalSearches: 0,
      uniqueUsers: 0,
      avgConfidence: 0,
      avgResponseTime: 0,
      avgSatisfaction: 0,
    };
  }

  const uniqueUserIds = new Set<string>();
  let totalConfidence = 0;
  let totalResponseTime = 0;
  let totalSatisfaction = 0;
  let satisfactionCount = 0;

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    uniqueUserIds.add(data.userId);

    totalConfidence += data.avgConfidence || 0;
    totalResponseTime += data.responseTime || 0;

    if (data.userSatisfaction !== undefined) {
      totalSatisfaction += data.userSatisfaction;
      satisfactionCount++;
    }
  });

  const count = snapshot.size;

  return {
    totalSearches: count,
    uniqueUsers: uniqueUserIds.size,
    avgConfidence: count > 0 ? totalConfidence / count : 0,
    avgResponseTime: count > 0 ? totalResponseTime / count : 0,
    avgSatisfaction: satisfactionCount > 0 ? totalSatisfaction / satisfactionCount : 0,
  };
}

