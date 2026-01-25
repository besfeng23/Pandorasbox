/**
 * Memory Pipeline Service
 * Orchestrates the full memory ingestion pipeline: chunking, summarization, vectorization, and storage
 */

import { embedText } from '@/lib/ai/embedding';
import { upsertPoint } from '@/lib/sovereign/qdrant-client';
import { completeInference } from '@/lib/sovereign/inference';
import { chunkText } from '@/lib/chunking';
import { ProcessingJob, ProcessingStatus } from '@/lib/schemas/processing';
import { v4 as uuidv4 } from 'uuid';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// In-memory job registry (Replace with Redis/DB in production)
const jobRegistry = new Map<string, ProcessingJob>();

/**
 * Get a processing job by ID
 */
export function getProcessingJob(jobId: string): ProcessingJob | null {
  return jobRegistry.get(jobId) || null;
}

/**
 * Orchestrates the full memory ingestion pipeline.
 * @param content The raw string content of the file.
 * @param filename The name of the file.
 * @param userId The ID of the user initiating the job.
 * @param agentId The agent ID (builder or universe).
 * @returns The initialized ProcessingJob object.
 */
export async function startMemoryPipeline(
  content: string,
  filename: string,
  userId: string,
  agentId: string = 'universe'
): Promise<ProcessingJob> {
  const jobId = uuidv4();
  const initialJob: ProcessingJob = {
    id: jobId,
    userId,
    agentId,
    filename,
    status: 'PENDING',
    totalChunks: 0,
    processedChunks: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  jobRegistry.set(jobId, initialJob);

  // Persist job to Firestore for tracking
  try {
    const db = getFirestoreAdmin();
    await db.collection(`users/${userId}/processing_jobs`).doc(jobId).set({
      ...initialJob,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.warn(`Failed to persist job ${jobId} to Firestore:`, error);
    // Continue with in-memory tracking
  }

  // Run the actual processing asynchronously
  processContent(jobId, content, filename, userId, agentId).catch((error) => {
    console.error(`Memory Pipeline Job Failed (${jobId}):`, error);
  });

  return initialJob;
}

async function processContent(
  jobId: string,
  content: string,
  filename: string,
  userId: string,
  agentId: string
) {
  const updateStatus = (
    status: ProcessingStatus,
    processedChunks = jobRegistry.get(jobId)?.processedChunks || 0,
    error?: string
  ) => {
    const job = jobRegistry.get(jobId);
    if (!job) return;

    job.status = status;
    job.updatedAt = new Date();
    job.processedChunks = processedChunks;
    if (error) {
      job.error = error;
    }
    jobRegistry.set(jobId, job);

    // Update Firestore
    try {
      const db = getFirestoreAdmin();
      db.collection(`users/${userId}/processing_jobs`)
        .doc(jobId)
        .update({
          status,
          processedChunks,
          updatedAt: FieldValue.serverTimestamp(),
          ...(error && { error }),
        });
    } catch (err) {
      console.warn(`Failed to update job ${jobId} in Firestore:`, err);
    }

    console.log(`[Job ${jobId}] Status: ${status} (${processedChunks}/${job.totalChunks})`);
  };

  try {
    updateStatus('CHUNKING');

    // 1. Chunking - Use existing chunking utility with semantic boundaries
    const chunks = chunkText(content, 4000, 200); // 4000 chars with 200 overlap

    const job = jobRegistry.get(jobId)!;
    job.totalChunks = chunks.length;
    jobRegistry.set(jobId, job);

    // Update total chunks in Firestore
    try {
      const db = getFirestoreAdmin();
      await db.collection(`users/${userId}/processing_jobs`).doc(jobId).update({
        totalChunks: chunks.length,
      });
    } catch (err) {
      console.warn(`Failed to update total chunks for job ${jobId}:`, err);
    }

    if (chunks.length === 0) {
      throw new Error('No chunks generated from content');
    }

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];

      updateStatus('EMBEDDING', i);

      // 2. Summarization using inference
      let summary = '';
      try {
        const summaryPrompt = `Analyze the following text chunk from the file "${filename}". Provide a concise, high-density summary (under 150 words) suitable for vector indexing and retrieval. Focus on key concepts, facts, and actionable information.

Text chunk:
${chunk}`;

        summary = await completeInference([
          {
            role: 'system',
            content:
              'You are a summarization assistant. Provide concise, information-dense summaries that preserve key facts and concepts.',
          },
          {
            role: 'user',
            content: summaryPrompt,
          },
        ]);
      } catch (summaryError) {
        console.warn(`Failed to generate summary for chunk ${i}:`, summaryError);
        // Continue without summary - use chunk content as fallback
        summary = chunk.substring(0, 150) + '...';
      }

      updateStatus('INDEXING', i);

      // 3. Vectorization
      const vector = await embedText(chunk);

      // 4. Create memory record
      const memoryId = uuidv4();
      const memoryPayload = {
        userId,
        agentId,
        filename,
        chunkIndex: i,
        content: chunk,
        summary: summary.trim(),
        sourceUrl: `file://${filename}`,
        sourceType: 'file_upload',
        createdAt: new Date().toISOString(),
        jobId, // Link back to processing job
      };

      // 5. Index to Qdrant
      await upsertPoint('memories', {
        id: memoryId,
        vector,
        payload: memoryPayload,
      });

      updateStatus('INDEXING', i + 1);
    }

    updateStatus('COMPLETED', chunks.length);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown processing error.';
    updateStatus('FAILED', jobRegistry.get(jobId)?.processedChunks || 0, errorMessage);
    console.error(`Memory Pipeline Job Failed (${jobId}):`, error);
  }
}

