'use server';

/**
 * Phase 6: Continuous Self-Improvement Flow
 * 
 * Genkit flow that orchestrates meta-learning and continuous improvement
 * based on performance metrics and user feedback.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { performBatchLearning, analyzePerformanceMetrics } from '@/lib/meta-learning';
import { analyzeFeedbackPatterns } from '@/lib/feedback-manager';
import { getSystemPerformanceStats } from '@/lib/performance-tracker';

const SelfImprovementInputSchema = z.object({
  userId: z.string().optional(), // Optional: analyze specific user, or all users if omitted
  daysBack: z.number().optional().default(7),
  performLearning: z.boolean().optional().default(true), // Whether to actually update weights
});

const SelfImprovementOutputSchema = z.object({
  usersAnalyzed: z.number(),
  usersUpdated: z.number(),
  avgSatisfactionChange: z.number(),
  performanceAnalysis: z.object({
    avgSatisfaction: z.number(),
    avgResponseTime: z.number(),
    optimalWeights: z.object({
      internal: z.number(),
      external: z.number(),
    }).optional(),
    recommendations: z.array(z.string()),
  }),
  feedbackAnalysis: z.object({
    avgSatisfaction: z.number(),
    commonIssues: z.array(z.string()),
    improvementSuggestions: z.array(z.string()),
  }),
  systemStats: z.object({
    totalSearches: z.number(),
    uniqueUsers: z.number(),
    avgConfidence: z.number(),
    avgResponseTime: z.number(),
    avgSatisfaction: z.number(),
  }),
});

/**
 * Runs the self-improvement flow that analyzes performance and updates learning states.
 */
export async function runSelfImprovement(
  input: z.infer<typeof SelfImprovementInputSchema>
): Promise<z.infer<typeof SelfImprovementOutputSchema>> {
  const selfImprovementFlow = ai.defineFlow(
    {
      name: 'runSelfImprovementFlow',
      inputSchema: SelfImprovementInputSchema,
      outputSchema: SelfImprovementOutputSchema,
    },
    async ({ userId, daysBack, performLearning }) => {
      console.log(`[runSelfImprovement] Starting self-improvement analysis (daysBack: ${daysBack}, userId: ${userId || 'all'})`);

      // Get performance metrics
      let performanceAnalysis;
      if (userId) {
        performanceAnalysis = await analyzePerformanceMetrics(userId, daysBack);
      } else {
        // For system-wide analysis, we'll use a representative user or aggregate
        // For now, we'll analyze the first user if no specific user provided
        performanceAnalysis = {
          avgSatisfaction: 0.5,
          avgResponseTime: 0,
          recommendations: ['System-wide analysis requires specific user or aggregation logic'],
        };
      }

      // Get feedback analysis
      const feedbackAnalysis = await analyzeFeedbackPatterns(daysBack);

      // Get system-wide stats
      const systemStats = await getSystemPerformanceStats(daysBack);

      // Perform batch learning if requested
      let usersUpdated = 0;
      let avgSatisfactionChange = 0;
      if (performLearning) {
        const learningResult = await performBatchLearning(userId);
        usersUpdated = learningResult.usersUpdated;
        avgSatisfactionChange = learningResult.avgSatisfactionChange;
      }

      // Format output
      const output = {
        usersAnalyzed: userId ? 1 : systemStats.uniqueUsers,
        usersUpdated,
        avgSatisfactionChange,
        performanceAnalysis: {
          avgSatisfaction: performanceAnalysis.avgSatisfaction,
          avgResponseTime: performanceAnalysis.avgResponseTime,
          optimalWeights: performanceAnalysis.optimalWeights
            ? {
                internal: performanceAnalysis.optimalWeights.internal,
                external: performanceAnalysis.optimalWeights.external,
              }
            : undefined,
          recommendations: performanceAnalysis.recommendations,
        },
        feedbackAnalysis: {
          avgSatisfaction: feedbackAnalysis.avgSatisfaction,
          commonIssues: feedbackAnalysis.commonIssues,
          improvementSuggestions: feedbackAnalysis.improvementSuggestions,
        },
        systemStats: {
          totalSearches: systemStats.totalSearches,
          uniqueUsers: systemStats.uniqueUsers,
          avgConfidence: systemStats.avgConfidence,
          avgResponseTime: systemStats.avgResponseTime,
          avgSatisfaction: systemStats.avgSatisfaction,
        },
      };

      console.log(
        `[runSelfImprovement] Self-improvement complete: ` +
        `${usersUpdated} users updated, satisfaction change: ${avgSatisfactionChange.toFixed(3)}`
      );

      return output;
    }
  );

  return await selfImprovementFlow(input);
}

