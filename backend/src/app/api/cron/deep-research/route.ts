import { NextRequest, NextResponse } from 'next/server';
import { runDeepResearchBatch } from '@/ai/agents/deep-research';
import { handleApiError, requireCron } from '@/server/api-auth';

/**
 * API route for the Deep Research Agent.
 * This should be called by Cloud Scheduler or a cron service every 6 hours.
 *
 * To set up Cloud Scheduler:
 * 1. Go to Google Cloud Console > Cloud Scheduler
 * 2. Create a new job that calls this endpoint every 6 hours
 * 3. Use your App Hosting URL: https://your-app-url/api/cron/deep-research
 * 4. Add a secret header for security (optional but recommended)
 */
export async function POST(request: NextRequest) {
  try {
    requireCron(request);

    const result = await runDeepResearchBatch();

    return NextResponse.json({
      success: true,
      ...result,
      message: `Deep research complete. Processed ${result.processed} topics with ${result.errors} errors.`,
    });
  } catch (error: any) {
    console.error('[DeepResearch] Fatal error in cron route:', error);
    return handleApiError(error, request);
  }
}


