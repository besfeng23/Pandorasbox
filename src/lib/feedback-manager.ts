'use server';

/**
 * Phase 6: Feedback Collection System
 * 
 * Manages collection and processing of user feedback to improve search quality.
 */

import { getFirestoreAdmin } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import { recordFeedback, FeedbackData } from './meta-learning';

export interface SearchFeedback {
  query: string;
  userId: string;
  resultIds: string[]; // IDs of results marked as useful
  satisfaction: number; // 0-1 scale (0 = poor, 1 = excellent)
  feedback?: string; // Optional text feedback
  context?: {
    internalCount: number;
    externalCount: number;
    avgConfidence: number;
    fusedScore?: number; // Optional fused score
    avgFusedScore?: number; // Alternative naming
  };
}

/**
 * Submits feedback for a search query.
 */
export async function submitFeedback(feedback: SearchFeedback): Promise<void> {
  if (!feedback.userId || !feedback.query) {
    throw new Error('UserId and query are required for feedback');
  }

  if (feedback.satisfaction < 0 || feedback.satisfaction > 1) {
    throw new Error('Satisfaction must be between 0 and 1');
  }

  const feedbackData: FeedbackData = {
    query: feedback.query,
    userId: feedback.userId,
    resultIds: feedback.resultIds || [],
    satisfaction: feedback.satisfaction,
    feedback: feedback.feedback,
    timestamp: new Date(),
  };

  await recordFeedback(feedbackData);

  // Also store detailed feedback for analysis
  const firestoreAdmin = getFirestoreAdmin();
  await firestoreAdmin.collection('feedback').add({
    ...feedback,
    timestamp: FieldValue.serverTimestamp(),
    type: 'search_feedback',
  });

  console.log(`[feedback-manager] Feedback recorded: user=${feedback.userId}, satisfaction=${feedback.satisfaction}`);
}

/**
 * Gets feedback history for a user.
 */
export async function getUserFeedback(
  userId: string,
  limit: number = 20
): Promise<SearchFeedback[]> {
  const firestoreAdmin = getFirestoreAdmin();
  const snapshot = await firestoreAdmin
    .collection('feedback')
    .where('userId', '==', userId)
    .where('type', '==', 'search_feedback')
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      query: data.query,
      userId: data.userId,
      resultIds: data.resultIds || [],
      satisfaction: data.satisfaction,
      feedback: data.feedback,
      context: data.context,
    };
  });
}

/**
 * Analyzes feedback patterns to identify common issues.
 */
export async function analyzeFeedbackPatterns(
  daysBack: number = 7
): Promise<{
  avgSatisfaction: number;
  commonIssues: string[];
  improvementSuggestions: string[];
}> {
  const firestoreAdmin = getFirestoreAdmin();
  const cutoffDate = Timestamp.fromDate(
    new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000)
  );

  const snapshot = await firestoreAdmin
    .collection('feedback')
    .where('type', '==', 'search_feedback')
    .where('timestamp', '>=', cutoffDate)
    .limit(100)
    .get();

  if (snapshot.empty) {
    return {
      avgSatisfaction: 0.5,
      commonIssues: ['No feedback data available yet'],
      improvementSuggestions: ['Encourage users to provide feedback on search results'],
    };
  }

  let totalSatisfaction = 0;
  const lowSatisfactionQueries: string[] = [];
  const feedbackTexts: string[] = [];

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    totalSatisfaction += data.satisfaction || 0.5;

    if (data.satisfaction < 0.5) {
      lowSatisfactionQueries.push(data.query);
    }

    if (data.feedback) {
      feedbackTexts.push(data.feedback);
    }
  });

  const avgSatisfaction = totalSatisfaction / snapshot.size;

  // Identify common issues
  const commonIssues: string[] = [];
  if (avgSatisfaction < 0.6) {
    commonIssues.push('Overall satisfaction is below optimal threshold');
  }
  if (lowSatisfactionQueries.length > snapshot.size * 0.3) {
    commonIssues.push('High proportion of low-satisfaction queries detected');
  }

  // Generate improvement suggestions
  const improvementSuggestions: string[] = [];
  if (avgSatisfaction < 0.7) {
    improvementSuggestions.push('Consider adjusting hybrid search weights based on feedback patterns');
  }
  if (lowSatisfactionQueries.length > 0) {
    improvementSuggestions.push('Review low-satisfaction queries to identify improvement opportunities');
  }
  if (feedbackTexts.length < snapshot.size * 0.2) {
    improvementSuggestions.push('Encourage more detailed text feedback from users');
  }

  return {
    avgSatisfaction,
    commonIssues,
    improvementSuggestions,
  };
}

