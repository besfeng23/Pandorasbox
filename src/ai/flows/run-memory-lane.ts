'use server';

import { ai } from '@/ai/genkit';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { generateEmbedding } from '@/lib/vector';
import OpenAI from 'openai';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});


const MemoryLaneInputSchema = z.object({
  userId: z.string(),
  message: z.string(),
  imageBase64: z.string().nullable(),
  source: z.string(),
});

const MemoryLaneOutputSchema = z.object({
  new_context_note: z.string(),
  search_queries: z.array(z.string()),
  image_description: z.string().optional(),
});

export async function runMemoryLane(
  input: z.infer<typeof MemoryLaneInputSchema>
): Promise<z.infer<typeof MemoryLaneOutputSchema>> {

  const memoryFlow = ai.defineFlow(
    {
      name: 'runMemoryLaneFlow',
      inputSchema: MemoryLaneInputSchema,
      outputSchema: MemoryLaneOutputSchema,
    },
    async ({ userId, message, imageBase64, source }) => {
      const firestoreAdmin = getFirestoreAdmin();
      const [settingsDoc, contextDoc] = await Promise.all([
        firestoreAdmin.collection('settings').doc(userId).get(),
        firestoreAdmin.collection('users').doc(userId).collection('state').doc('context').get(),
      ]);

      const settings = { active_model: 'gpt-4o', ...settingsDoc.data() };
      const currentContext = contextDoc.exists ? contextDoc.data()?.note : 'No context yet.';
      
      let systemPrompt: string;
      const userMessage: ChatCompletionMessageParam[] = [];

      if (imageBase64) {
          systemPrompt = `You are a memory manager. The user has uploaded an image. Analyze it in extreme detail. Describe all text, diagrams, and visual elements so they can be retrieved by search later. The user may have also provided a text message.
Return a JSON object containing:
- "new_context_note" (string): An updated context note based on the image and message.
- "search_queries" (array of strings): Keywords and questions related to the image content.
- "image_description" (string): A detailed description of the image.`;
          
          userMessage.push({
            role: 'user', 
            content: [
                { type: 'text', text: `Current Context: "${currentContext}"\n\nUser Message: "${message}"` },
                { type: 'image_url', image_url: { url: imageBase64 } }
            ]
          });
      } else {
        systemPrompt = `You are a memory manager. Read the current context note and the new user message. Return a JSON object containing: "new_context_note" (string) and "search_queries" (array of strings).`;
        if (source === 'voice') {
            systemPrompt += ` The user message is a voice transcript. It may be rambling. Clean it up, summarize the intent, and incorporate it into the new context note.`
        }
        userMessage.push({ role: 'user', content: `Current Context: "${currentContext}"\n\nUser Message: "${message}"` });
      }

      const completion = await openai.chat.completions.create({
        model: settings.active_model as any,
        messages: [
            { role: 'system', content: systemPrompt },
            ...userMessage
        ],
        response_format: { type: 'json_object' },
      });
      
      const responseText = completion.choices[0].message.content || '{}';
      const responseData = JSON.parse(responseText);

      const stateCollection = firestoreAdmin.collection('users').doc(userId).collection('state');
      await stateCollection.doc('context').set({ note: responseData.new_context_note }, { merge: true });
      
      // Create memories from search queries
      const searchQueries = responseData.search_queries || [];
      if (searchQueries.length > 0) {
        const memoriesCollection = firestoreAdmin.collection('memories');
        const batch = firestoreAdmin.batch();
        for (const query of searchQueries) {
            const embedding = await generateEmbedding(query);
            const docRef = memoriesCollection.doc();
            batch.set(docRef, {
                id: docRef.id,
                content: query,
                embedding,
                createdAt: new Date(),
                userId: userId,
            });
        }
        await batch.commit();
      }

      return responseData;
    }
  );

  return memoryFlow(input);
}
