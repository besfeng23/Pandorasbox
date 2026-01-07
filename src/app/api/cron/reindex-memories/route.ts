import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { generateEmbedding } from '@/lib/vector';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Cron endpoint to reindex all memories missing embeddings.
 * 
 * This endpoint:
 * 1. Queries all memories in the 'memories' collection
 * 2. Identifies documents missing the 'embedding' field or with invalid embeddings
 * 3. Generates embeddings for each memory's content
 * 4. Updates the documents with the new embeddings
 * 
 * To set up Cloud Scheduler:
 * 1. Go to Google Cloud Console > Cloud Scheduler
 * 2. Create a new job that calls this endpoint (e.g., daily at 2 AM UTC)
 * 3. Use your App Hosting URL: https://your-app-url/api/cron/reindex-memories
 * 4. Add a secret header for security (optional but recommended)
 * 
 * Security: Consider adding authentication check:
 * const authHeader = request.headers.get('authorization');
 * if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const firestoreAdmin = getFirestoreAdmin();
    
    console.log('[ReindexMemories] Starting global reindex of all memories...');
    
    // Query all memories - we'll process in batches to avoid memory issues
    const memoriesCollection = firestoreAdmin.collection('memories');
    
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let lastDoc: any = null;
    const BATCH_SIZE = 100; // Process 100 documents at a time
    const WRITE_BATCH_SIZE = 500; // Firestore batch write limit
    
    // Process in batches to handle large collections
    while (true) {
      let query = memoriesCollection.orderBy('__name__').limit(BATCH_SIZE);
      
      if (lastDoc) {
        query = query.startAfter(lastDoc);
      }
      
      const snapshot = await query.get();
      
      if (snapshot.empty) {
        break; // No more documents
      }
      
      console.log(`[ReindexMemories] Processing batch of ${snapshot.size} memories...`);
      
      let writeBatch = firestoreAdmin.batch();
      let writeBatchCount = 0;
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const memoryId = doc.id;
        
        // Check if embedding exists and is valid (1536 dimensions, not all zeros)
        const hasValidEmbedding = data.embedding && 
                                  Array.isArray(data.embedding) && 
                                  data.embedding.length === 1536 &&
                                  data.embedding.some((v: any) => v !== 0);
        
        if (hasValidEmbedding) {
          totalSkipped++;
          continue;
        }
        
        // Skip if no content
        if (!data.content || typeof data.content !== 'string' || !data.content.trim()) {
          console.warn(`[ReindexMemories] Memory ${memoryId} has no valid content, skipping`);
          totalSkipped++;
          continue;
        }
        
        try {
          console.log(`[ReindexMemories] Generating embedding for memory ${memoryId}: "${data.content.substring(0, 50)}..."`);
          
          // Generate embedding
          const embedding = await generateEmbedding(data.content.trim());
          
          // Add to batch update
          writeBatch.update(doc.ref, {
            embedding: embedding,
            reindexedAt: FieldValue.serverTimestamp(),
          });
          
          writeBatchCount++;
          totalProcessed++;
          
          // Commit batch if it reaches the limit and create new batch
          if (writeBatchCount >= WRITE_BATCH_SIZE) {
            await writeBatch.commit();
            console.log(`[ReindexMemories] Committed batch of ${writeBatchCount} updates`);
            writeBatchCount = 0;
            writeBatch = firestoreAdmin.batch(); // Create new batch for remaining updates
          }
          
        } catch (error: any) {
          console.error(`[ReindexMemories] Error re-indexing memory ${memoryId}:`, error);
          totalErrors++;
        }
      }
      
      // Commit remaining updates in this batch
      if (writeBatchCount > 0) {
        await writeBatch.commit();
        console.log(`[ReindexMemories] Committed final batch of ${writeBatchCount} updates`);
      }
      
      // Update lastDoc for pagination
      lastDoc = snapshot.docs[snapshot.docs.length - 1];
      
      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`[ReindexMemories] Complete: processed=${totalProcessed}, skipped=${totalSkipped}, errors=${totalErrors}`);
    
    return NextResponse.json({
      success: true,
      message: `Re-indexed ${totalProcessed} memories. ${totalSkipped} already had embeddings. ${totalErrors} errors.`,
      processed: totalProcessed,
      skipped: totalSkipped,
      errors: totalErrors,
    });
    
  } catch (error: any) {
    console.error('[ReindexMemories] Fatal error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Reindex failed', 
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}

