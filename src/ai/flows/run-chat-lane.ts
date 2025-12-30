'use server';

import { ai } from '@/ai/genkit';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { runMemoryLane } from './run-memory-lane';
import { runAnswerLane } from './run-answer-lane';
import { suggestFollowUpQuestions } from './suggest-follow-up-questions';
import { generateEmbedding } from '@/lib/vector';

const ChatLaneInputSchema = z.object({
  userId: z.string(),
  message: z.string(),
  imageBase64: z.string().nullable(),
  source: z.string(),
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
    async ({ userId, message, imageBase64, source }) => {
      // 1. Create a placeholder for the assistant's response.
      const assistantRef = firestoreAdmin.collection('users').doc(userId).collection('history').doc();
      await assistantRef.set({
        id: assistantRef.id,
        role: 'assistant',
        content: '',
        status: 'processing',
        progress_log: ['Initializing agent...'],
        timestamp: new Date(),
        userId: userId,
      });

      // 2. Run memory lane to process the input and get search queries.
      const memoryResult = await runMemoryLane({
        userId,
        message,
        imageBase64,
        source,
      });

      // 3. Save the user's message with the image description from memory lane.
      const userMessageEmbedding = await generateEmbedding(memoryResult.image_description || message);
      await firestoreAdmin.collection('users').doc(userId).collection('history').where('role', '==', 'user').orderBy('timestamp', 'desc').limit(1).get().then(snapshot => {
        if (!snapshot.empty) {
          const userMessageDoc = snapshot.docs[0];
          userMessageDoc.ref.update({
            embedding: userMessageEmbedding,
            imageDescription: memoryResult.image_description ?? null,
          });
        }
      });
      

      // 4. Run the answer lane to generate a response.
      const answerResult = await runAnswerLane({
        userId,
        message: message || memoryResult.image_description || 'Describe the image.',
        assistantMessageId: assistantRef.id,
      });

      // 5. Suggest follow-up questions.
      const suggestions = await suggestFollowUpQuestions({
        userMessage: message,
        aiResponse: answerResult.answer,
      });

      // 6. Save suggestions to Firestore.
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