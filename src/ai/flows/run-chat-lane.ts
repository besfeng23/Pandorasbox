
'use server';

import { ai } from '@/ai/genkit';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { runMemoryLane } from './run-memory-lane';
import { runAnswerLane } from './run-answer-lane';
import { suggestFollowUpQuestions } from './suggest-follow-up-questions';
import { FieldValue } from 'firebase-admin/firestore';

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
      // 1. Create a placeholder for the assistant's response in the correct subcollection.
      const assistantRef = firestoreAdmin.collection('users').doc(userId).collection('history').doc();
      await assistantRef.set({
        id: assistantRef.id,
        role: 'assistant',
        content: '',
        status: 'processing',
        progress_log: ['Initializing agent...'],
        timestamp: FieldValue.serverTimestamp(),
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
    }
  );

  await chatFlow(input);
}
