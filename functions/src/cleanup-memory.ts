import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();
const firestore = admin.firestore();

/**
 * Scheduled function to automatically clean up old threads and memories.
 * Runs daily at 2 AM UTC to archive/delete data older than retention period.
 */
export const cleanupOldData = functions
  .runWith({
    timeoutSeconds: 540, // 9 minutes max
    memory: "512MB",
  })
  .pubsub.schedule("every day 02:00")
  .timeZone("UTC")
  .onRun(async (context) => {
    console.log("Starting memory cleanup job...");
    
    const retentionDays = 90; // Keep data for 90 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    
    let deletedThreads = 0;
    let deletedMemories = 0;
    let deletedHistory = 0;
    
    try {
      // Clean up old threads
      const oldThreadsSnapshot = await firestore
        .collection("threads")
        .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
        .limit(500) // Process in batches
        .get();
      
      const threadBatch = firestore.batch();
      oldThreadsSnapshot.docs.forEach((doc) => {
        threadBatch.delete(doc.ref);
        deletedThreads++;
      });
      await threadBatch.commit();
      
      // Clean up old memories
      const oldMemoriesSnapshot = await firestore
        .collection("memories")
        .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
        .limit(500)
        .get();
      
      const memoryBatch = firestore.batch();
      oldMemoriesSnapshot.docs.forEach((doc) => {
        memoryBatch.delete(doc.ref);
        deletedMemories++;
      });
      await memoryBatch.commit();
      
      // Clean up old history messages (older than retention period)
      const oldHistorySnapshot = await firestore
        .collection("history")
        .where("createdAt", "<", admin.firestore.Timestamp.fromDate(cutoffDate))
        .limit(500)
        .get();
      
      const historyBatch = firestore.batch();
      oldHistorySnapshot.docs.forEach((doc) => {
        historyBatch.delete(doc.ref);
        deletedHistory++;
      });
      await historyBatch.commit();
      
      console.log(`Cleanup complete: ${deletedThreads} threads, ${deletedMemories} memories, ${deletedHistory} history messages deleted.`);
      
      return {
        success: true,
        deletedThreads,
        deletedMemories,
        deletedHistory,
      };
    } catch (error) {
      console.error("Error during cleanup:", error);
      throw error;
    }
  });

