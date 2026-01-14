'use server';

/**
 * Deep Research Agent
 *
 * Periodically processes topics from the `learning_queue` collection,
 * performs web search using Tavily, synthesizes a dense knowledge artifact
 * via LLM, and saves it into the `memories` collection as acquired knowledge.
 */

import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { tavilySearch } from '@/lib/tavily';
import { ai } from '@/ai/genkit';
import { FieldValue } from 'firebase-admin/firestore';
import { saveMemory } from '@/lib/memory-utils';

export interface DeepResearchResult {
  processed: number;
  errors: number;
  topicsProcessed: string[];
  errorDetails?: string[];
}

/**
 * Runs a single deep research batch over the learning_queue.
 * Intended to be called from a scheduled cron route.
 */
export async function runDeepResearchBatch(maxTopics: number = 5): Promise<DeepResearchResult> {
  // Optional feature flag to disable deep research without code changes
  if (process.env.ENABLE_DEEP_RESEARCH?.trim() === 'false') {
    console.log('[DeepResearch] ENABLE_DEEP_RESEARCH=false, skipping run.');
    return {
      processed: 0,
      errors: 0,
      topicsProcessed: [],
    };
  }

  const firestoreAdmin = getFirestoreAdmin();
  const queueCollection = firestoreAdmin.collection('learning_queue');

  const errorDetails: string[] = [];
  const topicsProcessed: string[] = [];
  let processed = 0;
  let errors = 0;

  try {
    // Fetch pending topics, oldest first
    const snapshot = await queueCollection
      .where('status', '==', 'pending')
      .orderBy('createdAt', 'asc')
      .limit(maxTopics)
      .get();

    if (snapshot.empty) {
      console.log('[DeepResearch] No pending topics in learning_queue.');
      return { processed: 0, errors: 0, topicsProcessed: [] };
    }

    console.log(`[DeepResearch] Found ${snapshot.size} pending topics to process.`);

    for (const doc of snapshot.docs) {
      const queueId = doc.id;
      const data = doc.data() || {};
      const topic = (data.topic || '').toString().trim();
      const userId = (data.userId || '').toString().trim();

      if (!topic) {
        console.warn(`[DeepResearch] Skipping queue item ${queueId}: missing topic`);
        errors++;
        errorDetails.push(`Queue item ${queueId}: missing topic`);
        continue;
      }

      if (!userId) {
        console.warn(`[DeepResearch] Skipping queue item ${queueId}: missing userId`);
        errors++;
        errorDetails.push(`Queue item ${queueId}: missing userId`);
        continue;
      }

      const queueRef = queueCollection.doc(queueId);

      try {
        console.log(`[DeepResearch] Processing topic "${topic}" for user ${userId} (queueId=${queueId})`);

        // Mark as processing
        await queueRef.update({
          status: 'processing',
          updatedAt: FieldValue.serverTimestamp(),
        });

        // ---- SEARCH PHASE ----
        const queries = [
          `Advanced guide to ${topic}`,
          `Key concepts in ${topic}`,
        ];

        const searchResults = [];
        for (const q of queries) {
          try {
            const result = await tavilySearch(q, { maxResults: 4 });
            searchResults.push(result);
          } catch (searchError: any) {
            console.warn(`[DeepResearch] Tavily search failed for query "${q}":`, searchError);
          }
        }

        if (searchResults.length === 0) {
          throw new Error('All Tavily searches failed or returned no results.');
        }

        // Flatten and format search results into a single text blob
        const formattedSearchText = searchResults
          .map(sr =>
            sr.results
              .map(r => {
                const snippet = (r.snippet || '').slice(0, 500); // keep snippets reasonably small
                return `TITLE: ${r.title}\nURL: ${r.url}\nSNIPPET: ${snippet}`;
              })
              .join('\n\n')
          )
          .join('\n\n-----------------------------\n\n');

        // ---- SYNTHESIS PHASE ----
        const completion = await ai.generate({
          model: 'vertexai/gemini-1.5-pro',
          prompt: [
            {
              text: "You are a research assistant. Summarize these search results into a dense, high-utility 'Knowledge Artifact'. Focus on facts, syntax, and principles. Do not be conversational. Write it so your future self can use it as a reference."
            },
            {
              text: `Topic: ${topic}\n\nHere are consolidated search results. Carefully study them and produce a single, cohesive knowledge artifact:\n\n${formattedSearchText}`
            }
          ],
          config: { temperature: 0 }
        });

        const artifact = completion.text.trim();
        if (!artifact) {
          throw new Error('LLM returned empty artifact.');
        }

        // ---- SAVE TO MEMORIES ----
        const saveResult = await saveMemory({
          content: artifact,
          userId,
          source: 'deep_research',
          metadata: {
            type: 'acquired_knowledge',
            topic,
            source: 'deep_research',
          },
        });

        if (!saveResult.success) {
          throw new Error(saveResult.message || 'Unknown error saving memory');
        }

        // Mark as done
        await queueRef.update({
          status: 'done',
          updatedAt: FieldValue.serverTimestamp(),
          memoryId: saveResult.memory_id || null,
        });

        processed++;
        topicsProcessed.push(topic);
        console.log(`[DeepResearch] Completed topic "${topic}" → memory ${saveResult.memory_id}`);
      } catch (topicError: any) {
        errors++;
        const msg = topicError?.message || String(topicError);
        errorDetails.push(`Topic "${topic}" (queueId=${queueId}): ${msg}`);
        console.error(`[DeepResearch] Failed for topic "${topic}" (queueId=${queueId}):`, topicError);

        try {
          await queueRef.update({
            status: 'error',
            updatedAt: FieldValue.serverTimestamp(),
            errorMessage: msg.slice(0, 500),
          });
        } catch (updateError) {
          console.error('[DeepResearch] Failed to mark queue item as error:', updateError);
        }
      }
    }
  } catch (error: any) {
    console.error('[DeepResearch] Fatal error in runDeepResearchBatch:', error);
    errorDetails.push(`Fatal error: ${error?.message || String(error)}`);
  }

  return {
    processed,
    errors,
    topicsProcessed,
    errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
  };
}


