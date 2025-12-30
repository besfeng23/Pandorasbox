'use server';

import { ai } from '@/ai/genkit';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { Part } from 'genkit';
import { z } from 'zod';
import { generateEmbedding } from '@/lib/vector';

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
      const [settingsDoc, contextDoc] = await Promise.all([
        firestoreAdmin.collection('settings').doc(userId).get(),
        firestoreAdmin.collection('users').doc(userId).collection('state').doc('context').get(),
      ]);

      const settings = { active_model: 'gpt-4o', ...settingsDoc.data() };
      const currentContext = contextDoc.exists ? contextDoc.data()?.note : 'No context yet.';
      
      let systemPrompt: string;
      const userMessage: Part[] = [];

      if (imageBase64) {
          systemPrompt = `You are a memory manager. The user has uploaded an image. Analyze it in extreme detail. Describe all text, diagrams, and visual elements so they can be retrieved by search later. The user may have also provided a text message.
Return a JSON object containing:
- "new_context_note" (string): An updated context note based on the image and message.
- "search_queries" (array of strings): Keywords and questions related to the image content.
- "image_description" (string): A detailed description of the image.`;
          
          userMessage.push({text: `Current Context: "${currentContext}"\n\nUser Message: "${message}"`});
          userMessage.push({ media: { url: imageBase64, contentType: 'image/jpeg' } });
      } else {
        systemPrompt = `You are a memory manager. Read the current context note and the new user message. Return a JSON object containing: "new_context_note" (string) and "search_queries" (array of strings).`;
        if (source === 'voice') {
            systemPrompt += ` The user message is a voice transcript. It may be rambling. Clean it up, summarize the intent, and incorporate it into the new context note.`
        }
        userMessage.push({ text: `Current Context: "${currentContext}"\n\nUser Message: "${message}"` });
      }


      const completion = await ai.generate({
        model: `googleai/${settings.active_model}`,
        prompt: userMessage,
        system: systemPrompt,
        config: {
            responseMimeType: 'application/json'
        }
      });
      
      const responseText = completion.text;
      const responseData = JSON.parse(responseText);

      const stateCollection = firestoreAdmin.collection('users').doc(userId).collection('state');
      await stateCollection.doc('context').set({ note: responseData.new_context_note }, { merge: true });
      await stateCollection.doc('last_state').set({ last_user_message: message }, { merge: true });
      
      if (responseData.image_description) {
        await firestoreAdmin.collection('users').doc(userId).collection('history').where('role', '==', 'user').orderBy('timestamp', 'desc').limit(1).get().then(snapshot => {
          if (!snapshot.empty) {
            const userMessageDoc = snapshot.docs[0];
            userMessageDoc.ref.update({
              imageDescription: responseData.image_description ?? null,
            });
          }
        });
      }

      // Create memories from search queries
      const searchQueries = responseData.search_queries || [];
      if (searchQueries.length > 0) {
        const memoriesCollection = firestoreAdmin.collection('users').doc(userId).collection('memories');
        const batch = firestoreAdmin.batch();
        for (const query of searchQueries) {
            const embedding = await generateEmbedding(query);
            const docRef = memoriesCollection.doc();
            batch.set(docRef, {
                id: docRef.id,
                content: query,
                embedding,
                timestamp: new Date(),
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
