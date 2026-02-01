/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MEMORY JANITOR CRON ENDPOINT
 * Background task for memory crystallization
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Trigger: Vercel Cron, Cloud Scheduler, or manual HTTP request
 * 
 * Security: Requires CRON_SECRET header for authentication
 * 
 * vercel.json cron config example:
 * {
 *   "crons": [{
 *     "path": "/api/cron/janitor",
 *     "schedule": "0 3 * * *"  // Daily at 3 AM
 *   }]
 * }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getMemoryJanitor } from '@/lib/hybrid/memory-janitor';
import { getFirestoreAdmin } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes max for background processing

/**
 * Verify the cron secret for secure invocation
 */
function verifyCronSecret(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    console.warn('[Janitor Cron] CRON_SECRET not configured');
    return false;
  }

  // Check Authorization header
  const authHeader = request.headers.get('Authorization');
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Check x-cron-secret header (Vercel cron)
  const cronHeader = request.headers.get('x-cron-secret');
  if (cronHeader === cronSecret) {
    return true;
  }

  // Check query parameter (for testing)
  const url = new URL(request.url);
  const querySecret = url.searchParams.get('secret');
  if (querySecret === cronSecret) {
    return true;
  }

  return false;
}

/**
 * GET /api/cron/janitor
 * Run memory janitor for all active users
 */
export async function GET(request: NextRequest) {
  // Verify authentication
  if (!verifyCronSecret(request)) {
    console.warn('[Janitor Cron] Unauthorized access attempt');
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Valid CRON_SECRET required' },
      { status: 401 }
    );
  }

  const startTime = Date.now();
  console.log('[Janitor Cron] Starting memory janitor run');

  try {
    const janitor = getMemoryJanitor();
    const db = getFirestoreAdmin();

    // Get all active users (users with activity in last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const usersSnapshot = await db
      .collection('users')
      .where('lastActive', '>', sevenDaysAgo)
      .limit(100) // Process max 100 users per run
      .get();

    const results: Array<{
      userId: string;
      agentId: string;
      result: any;
    }> = [];

    // Process each user's memories
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;

      // Run janitor for 'universe' agent (primary agent)
      try {
        const result = await janitor.run(userId, 'universe');
        results.push({
          userId: userId.slice(0, 8) + '...', // Truncate for privacy
          agentId: 'universe',
          result: {
            processed: result.processedMemories,
            created: result.createdFacts,
            deleted: result.deletedMemories,
            errors: result.errors.length
          }
        });
      } catch (err: any) {
        console.error(`[Janitor Cron] Error processing user ${userId}:`, err.message);
        results.push({
          userId: userId.slice(0, 8) + '...',
          agentId: 'universe',
          result: { error: err.message }
        });
      }
    }

    const totalTime = Date.now() - startTime;

    console.log(`[Janitor Cron] Completed in ${totalTime}ms, processed ${results.length} users`);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      durationMs: totalTime,
      usersProcessed: results.length,
      results
    });

  } catch (error: any) {
    console.error('[Janitor Cron] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
        durationMs: Date.now() - startTime
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cron/janitor
 * Run memory janitor for a specific user (manual trigger)
 */
export async function POST(request: NextRequest) {
  // Verify authentication
  if (!verifyCronSecret(request)) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Valid CRON_SECRET required' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { userId, agentId = 'universe' } = body;

    if (!userId) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'userId is required' },
        { status: 400 }
      );
    }

    console.log(`[Janitor Cron] Manual run for user: ${userId}, agent: ${agentId}`);

    const janitor = getMemoryJanitor();
    const result = await janitor.run(userId, agentId);

    return NextResponse.json({
      success: true,
      userId: userId.slice(0, 8) + '...',
      agentId,
      result
    });

  } catch (error: any) {
    console.error('[Janitor Cron] Manual run error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
