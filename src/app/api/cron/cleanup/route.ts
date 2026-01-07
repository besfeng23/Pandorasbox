import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import admin from 'firebase-admin';

// Prevent this route from being statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * API route for scheduled memory cleanup.
 * This should be called by Cloud Scheduler or a cron service.
 * 
 * To set up Cloud Scheduler:
 * 1. Go to Google Cloud Console > Cloud Scheduler
 * 2. Create a new job that calls this endpoint daily
 * 3. Use your App Hosting URL: https://your-app-url/api/cron/cleanup
 * 4. Add a secret header for security (see below)
 * 
 * Security: Add a secret token in your environment variables and check it here.
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify the request is from Cloud Scheduler
    // Uncomment and set CRON_SECRET in your environment variables
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const retentionDays = 90; // Keep data for 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    let deletedThreads = 0;
    let deletedMemories = 0;
    let deletedHistory = 0;
    
    const firestoreAdmin = getFirestoreAdmin();
    
    // Clean up old threads
    const oldThreadsSnapshot = await firestoreAdmin
      .collection("threads")
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
      .limit(500) // Process in batches
      .get();
    
    if (!oldThreadsSnapshot.empty) {
      const threadBatch = firestoreAdmin.batch();
      oldThreadsSnapshot.docs.forEach((doc) => {
        threadBatch.delete(doc.ref);
        deletedThreads++;
      });
      await threadBatch.commit();
    }
    
    // Clean up old memories
    const oldMemoriesSnapshot = await firestoreAdmin
      .collection("memories")
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
      .limit(500)
      .get();
    
    if (!oldMemoriesSnapshot.empty) {
      const memoryBatch = firestoreAdmin.batch();
      oldMemoriesSnapshot.docs.forEach((doc) => {
        memoryBatch.delete(doc.ref);
        deletedMemories++;
      });
      await memoryBatch.commit();
    }
    
    // Clean up old history messages
    const oldHistorySnapshot = await firestoreAdmin
      .collection("history")
      .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
      .limit(500)
      .get();
    
    if (!oldHistorySnapshot.empty) {
      const historyBatch = firestoreAdmin.batch();
      oldHistorySnapshot.docs.forEach((doc) => {
        historyBatch.delete(doc.ref);
        deletedHistory++;
      });
      await historyBatch.commit();
    }
    
    return NextResponse.json({
      success: true,
      deletedThreads,
      deletedMemories,
      deletedHistory,
      message: `Cleanup complete: ${deletedThreads} threads, ${deletedMemories} memories, ${deletedHistory} history messages deleted.`,
    });
  } catch (error: any) {
    console.error('Error during cleanup:', error);
    return NextResponse.json(
      { error: 'Cleanup failed', details: error.message },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}

