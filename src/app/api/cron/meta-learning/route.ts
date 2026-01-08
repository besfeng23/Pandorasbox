import { NextRequest, NextResponse } from 'next/server';
import { runSelfImprovement } from '@/ai/flows/run-self-improvement';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/cron/meta-learning
 * 
 * Scheduled cron job for continuous self-improvement.
 * Analyzes performance metrics and updates learning states.
 * 
 * This endpoint should be called by Cloud Scheduler on a regular basis
 * (e.g., daily or weekly).
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret) {
      const providedSecret = authHeader?.replace('Bearer ', '');
      if (providedSecret !== cronSecret) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        );
      }
    }

    console.log('[meta-learning-cron] Starting scheduled meta-learning job...');

    // Run self-improvement for all users
    const result = await runSelfImprovement({
      daysBack: 7, // Analyze last 7 days
      performLearning: true, // Actually update weights
    });

    console.log(
      `[meta-learning-cron] Meta-learning complete: ` +
      `${result.usersUpdated} users updated, ` +
      `avg satisfaction change: ${result.avgSatisfactionChange.toFixed(3)}`
    );

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      result: {
        usersAnalyzed: result.usersAnalyzed,
        usersUpdated: result.usersUpdated,
        avgSatisfactionChange: result.avgSatisfactionChange,
        systemStats: result.systemStats,
        recommendations: [
          ...result.performanceAnalysis.recommendations,
          ...result.feedbackAnalysis.improvementSuggestions,
        ],
      },
    });

  } catch (error: any) {
    console.error('[meta-learning-cron] Error in meta-learning job:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to run meta-learning',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  // Allow POST as well for manual triggers
  return GET(request);
}

