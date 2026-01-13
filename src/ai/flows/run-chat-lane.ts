
'use server';

import { ai } from '@/ai/genkit';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { runMemoryLane } from './run-memory-lane';
import { runAnswerLane } from './run-answer-lane';
import { suggestFollowUpQuestions } from './suggest-follow-up-questions';
import { FieldValue } from 'firebase-admin/firestore';
import { summarizeThread } from '@/app/actions';
import { sendKairosEvent } from '@/lib/kairosClient';

const ChatLaneInputSchema = z.object({
  userId: z.string(),
  message: z.string(),
  messageId: z.string().optional(), // Added messageId
  imageBase64: z.string().nullable(),
  audioUrl: z.string().optional(),
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
    async ({ userId, message, messageId, imageBase64, audioUrl, source, threadId }) => {
      const firestoreAdmin = getFirestoreAdmin();
      
      // Emit Kairos event: chat lane started
      if (messageId) {
        sendKairosEvent('system.lane.chat.started', {
          threadId,
          messageId,
          userId,
        }, { correlationId: threadId }).catch(err => console.warn('Failed to emit lane.chat.started event:', err));
      }
      
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

      // 2. Run memory lane to process the input (Fire-and-Forget).
      // We do NOT await this, allowing the answer lane to start immediately.
      runMemoryLane({
        userId,
        message,
        messageId, // Pass messageId
        imageBase64,
        audioUrl, // Pass audioUrl
        source,
      }).catch(err => console.error("Memory Lane failed:", err));

      // 3. Run the answer lane to generate a response.
      // We pass imageBase64 directly so it doesn't need to wait for memory lane's description.
      // Add timeout wrapper to prevent infinite processing
      const answerResult = await Promise.race([
        runAnswerLane({
          userId,
          message: message || (audioUrl ? 'Process this audio.' : 'Describe the image.'), // Fallback if message is empty
          imageBase64: imageBase64,
          audioUrl: audioUrl, // Pass audioUrl
          assistantMessageId: assistantRef.id,
          threadId, // Pass threadId to answer lane
        }).then(result => {
          // Emit Kairos event: chat lane completed
          sendKairosEvent('system.lane.chat.completed', {
            assistantMessageId: assistantRef.id,
            threadId,
            userId,
          }, { correlationId: threadId }).catch(err => console.warn('Failed to emit lane.chat.completed event:', err));
          
          // Emit response completed event
          sendKairosEvent('system.chat.response_completed', {
            threadId,
            assistantMessageId: assistantRef.id,
            userId,
          }, { correlationId: threadId }).catch(err => console.warn('Failed to emit chat.response_completed event:', err));
          
          return result;
        }),
        new Promise<{ answer: string }>((_, reject) => 
          setTimeout(() => reject(new Error('Answer lane timeout after 120 seconds')), 120000)
        )
      ]).catch(async (error) => {
        console.error('[ChatLane] Answer lane failed or timed out:', error);
        // Mark the assistant message as error
        try {
          await assistantRef.update({
            content: 'Sorry, the response took too long or encountered an error. Please try again.',
            status: 'error',
            progress_log: FieldValue.arrayUnion(`Timeout or error: ${error?.message || 'Unknown'}`),
          });
        } catch (updateError) {
          console.error('[ChatLane] Failed to update timeout error:', updateError);
        }
        return { answer: 'Error: Request timed out or failed.' };
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

      // 4. Suggest follow-up questions (non-blocking, don't fail if this errors)
      suggestFollowUpQuestions({
        userMessage: message,
        aiResponse: answerResult.answer,
      }).then(suggestions => {
        // Save suggestions to Firestore
        const suggestionsDocRef = firestoreAdmin.collection('users').doc(userId).collection('state').doc('suggestions');
        return suggestionsDocRef.set({
          id: suggestionsDocRef.id,
          suggestions: suggestions,
          timestamp: new Date(),
        });
      }).catch(err => {
        console.warn('[ChatLane] Failed to generate suggestions:', err);
        // Non-critical, continue
      });
      
      // 5. Summarize the thread if it's long enough (non-blocking)
      summarizeThread(threadId, userId).catch(err => console.error("[ChatLane] Summarization failed:", err));
    }
  );

  await chatFlow(input);
}
