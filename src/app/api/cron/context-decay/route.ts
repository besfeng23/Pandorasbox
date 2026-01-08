/**
 * Phase 3: Context Decay Cron Job
 * 
 * Periodically reduces importance of memories that haven't been accessed recently
 * This ensures the context layer adapts to current user behavior
 */

import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Decay factor: memories lose 3% importance per run
 */
const DECAY_FACTOR = 0.97;

/**
 * Minimum importance before stopping decay (prevents negative values)
 */
const MIN_IMPORTANCE = 0.1;

/**
 * GET handler for cron triggers (Cloud Scheduler)
 */
export async function GET(request: NextRequest) {
  // Verify cron authorization header if present
  const authHeader = request.headers.get('authorization');
  const cronKey = process.env.CRON_SECRET;
  
  if (cronKey && authHeader !== `Bearer ${cronKey}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return POST(request);
}

/**
 * POST handler for cron triggers
 */
export async function POST(request: NextRequest) {
  try {
    const firestoreAdmin = getFirestoreAdmin();
    const memoriesCollection = firestoreAdmin.collection('memories');
    const contextStoreCollection = firestoreAdmin.collection('context_store');

    let memoriesUpdated = 0;
    let contextsUpdated = 0;

    // Decay importance in memories collection
    const memoriesSnapshot = await memoriesCollection
      .where('importance', '>', MIN_IMPORTANCE)
      .limit(500) // Process in batches
      .get();

    const memoriesBatch = firestoreAdmin.batch();
    let batchCount = 0;

    for (const doc of memoriesSnapshot.docs) {
      const data = doc.data();
      const currentImportance = data.importance ?? 0.5;

      if (currentImportance > MIN_IMPORTANCE) {
        const newImportance = Math.max(MIN_IMPORTANCE, currentImportance * DECAY_FACTOR);
        memoriesBatch.update(doc.ref, {
          importance: newImportance,
          lastDecay: FieldValue.serverTimestamp(),
        });
        batchCount++;
        memoriesUpdated++;

        // Commit batch every 500 operations (Firestore limit)
        if (batchCount >= 500) {
          await memoriesBatch.commit();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await memoriesBatch.commit();
    }

    // Decay importance in context_store sessions
    const contextsSnapshot = await contextStoreCollection
      .limit(500)
      .get();

    const contextsBatch = firestoreAdmin.batch();
    batchCount = 0;

    for (const doc of contextsSnapshot.docs) {
      const data = doc.data();
      const activeMemories = data.activeMemories || [];

      if (activeMemories.length > 0) {
        const updatedMemories = activeMemories.map((m: any) => {
          const currentImportance = m.importance ?? 0.5;
          if (currentImportance > MIN_IMPORTANCE) {
            return {
              ...m,
              importance: Math.max(MIN_IMPORTANCE, currentImportance * DECAY_FACTOR),
            };
          }
          return m;
        });

        contextsBatch.update(doc.ref, {
          activeMemories: updatedMemories,
          lastDecay: FieldValue.serverTimestamp(),
        });
        batchCount++;
        contextsUpdated++;

        if (batchCount >= 500) {
          await contextsBatch.commit();
          batchCount = 0;
        }
      }
    }

    if (batchCount > 0) {
      await contextsBatch.commit();
    }

    return NextResponse.json({
      success: true,
      memoriesUpdated,
      contextsUpdated,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Error in context decay cron:', error);
    return NextResponse.json(
      {
        error: 'Failed to decay context',
        details: error.message,
      },
      { status: 500 }
    );
  }
}

