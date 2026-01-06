
'use server';

import { ai } from '@/ai/genkit';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { runMemoryLane } from './run-memory-lane';
import { runAnswerLane } from './run-answer-lane';
import { suggestFollowUpQuestions } from './suggest-follow-up-questions';
import { FieldValue } from 'firebase-admin/firestore';
import { summarizeThread } from '@/app/actions';

const ChatLaneInputSchema = z.object({
  userId: z.string(),
  message: z.string(),
  imageBase64: z.string().nullable(),
  source: z.string(),
  threadId: z.string(), // Added threadId
});

export async function runChatLane(
  input: z.infer<typeof ChatLaneInputSchema>
): Promise<void> {
  const chatFlow = ai.defineFlow(
    {
      name: 'runChatLaneFlow',
      inputSchema: ChatLaneInputSchema,
      outputSchema: z.void(),
    },
    async ({ userId, message, imageBase64, source, threadId }) => {
      const firestoreAdmin = getFirestoreAdmin();
      // 1. Create a placeholder for the assistant's response in the correct subcollection.
      const assistantRef = firestoreAdmin.collection('history').doc();
      await assistantRef.set({
        id: assistantRef.id,
        role: 'assistant',
        content: '',
        status: 'processing',
        progress_log: ['Initializing agent...'],
        createdAt: FieldValue.serverTimestamp(),
        userId: userId, 
        threadId: threadId, // Save threadId to the AI's message
      });

      // 2. Run memory lane to process the input.
      const memoryResult = await runMemoryLane({
        userId,
        message,
        imageBase64,
        source,
      });

      // 3. Run the answer lane to generate a response.
      const answerResult = await runAnswerLane({
        userId,
        message: message || memoryResult.image_description || 'Describe the image.',
        assistantMessageId: assistantRef.id,
        threadId, // Pass threadId to answer lane
      });

      // 3b. If the model reports low confidence for a specific topic, enqueue it for deep research (silent).
      try {
        if (process.env.ENABLE_DEEP_RESEARCH?.trim() !== 'false') {
          const topic = answerResult.lowConfidenceTopic?.trim();
          if (topic) {
            const queueRef = firestoreAdmin.collection('learning_queue').doc();
            await queueRef.set({
              id: queueRef.id,
              topic,
              userId,
              status: 'pending',
              createdAt: FieldValue.serverTimestamp(),
              updatedAt: FieldValue.serverTimestamp(),
              source: 'low_confidence_answer',
            });
          }
        }
      } catch (queueError) {
        console.warn('[ChatLane] Failed to enqueue topic for deep research:', queueError);
      }

      // 4. Suggest follow-up questions.
      const suggestions = await suggestFollowUpQuestions({
        userMessage: message,
        aiResponse: answerResult.answer,
      });

      // 5. Save suggestions to Firestore.
      const suggestionsDocRef = firestoreAdmin.collection('users').doc(userId).collection('state').doc('suggestions');
      await suggestionsDocRef.set({
        id: suggestionsDocRef.id,
        suggestions: suggestions,
        timestamp: new Date(),
      });
      
      // 6. Summarize the thread if it's long enough (non-blocking)
      summarizeThread(threadId, userId).catch(err => console.error("Summarization failed:", err));
    }
  );

  await chatFlow(input);
}
