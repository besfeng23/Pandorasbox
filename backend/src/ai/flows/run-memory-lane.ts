'use server';

import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { FieldValue } from 'firebase-admin/firestore';
import { chatCompletion } from '@/server/inference-client';

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
  const { userId, message, imageBase64, source } = input;
  const firestoreAdmin = getFirestoreAdmin();
  const [settingsDoc, contextDoc] = await Promise.all([
    firestoreAdmin.collection('settings').doc(userId).get(),
    firestoreAdmin.collection('users').doc(userId).collection('state').doc('context').get(),
  ]);

  const currentContext = contextDoc.exists ? contextDoc.data()?.note : 'No context yet.';
  
  let systemPrompt: string;
  const userMessages: any[] = [];

  if (imageBase64) {
      systemPrompt = `You are a memory manager. The user has uploaded an image. Analyze it in extreme detail. Describe all text, diagrams, and visual elements so they can be retrieved by search later. The user may have also provided a text message.
Return ONLY a JSON object containing:
- "new_context_note" (string): An updated context note based on the image and message.
- "search_queries" (array of strings): Keywords and questions related to the image content.
- "image_description" (string): A detailed description of the image.
- "decisions" (array of objects): Extract any conclusions or agreements reached. Format: { "topic": string, "decision": string }`;
      
      userMessages.push({
        role: 'user', 
        content: `Current Context: "${currentContext}"\n\nUser Message: "${message}"\n\n[Image Provided in Base64]`
      });
  } else {
    systemPrompt = `You are a memory manager. Your job is to extract key information from user messages and create searchable memories.

Read the current context note and the new user message. Extract ALL important information including:
- User preferences, settings, or choices
- Personal facts, names, or details about the user
- Instructions or guidelines the user provides
- Character descriptions, voice instructions, or style preferences
- Important context that should be remembered for future conversations

Return ONLY a JSON object with:
- "new_context_note" (string): An updated context note that summarizes the conversation so far
- "search_queries" (array of strings): Extract 3-10 searchable memory items. Each should be a concise phrase (5-20 words) that captures key information.
- "decisions" (array of objects): Extract any conclusions or agreements reached. Format: { "topic": string, "decision": string }

IMPORTANT: Always generate at least 3-5 search_queries if there is ANY meaningful information in the user's message.`;

    if (source === 'voice') {
        systemPrompt += ` The user message is a voice transcript. It may be rambling. Clean it up, summarize the intent, and incorporate it into the new context note.`
    }
    userMessages.push({ role: 'user', content: `Current Context: "${currentContext}"\n\nUser Message: "${message}"` });
  }

  const completion = await chatCompletion({
    messages: [
      { role: 'system', content: systemPrompt },
      ...userMessages
    ],
    temperature: 0.7
  });

  const responseText = completion.choices[0].message.content || '{}';
  const jsonMatch = responseText.match(/\{.*\}/s);
  const responseData = JSON.parse(jsonMatch ? jsonMatch[0] : responseText);

  const stateCollection = firestoreAdmin.collection('users').doc(userId).collection('state');
  await stateCollection.doc('context').set({ note: responseData.new_context_note }, { merge: true });
  
  const searchQueries = responseData.search_queries || [];
  if (searchQueries.length > 0) {
    const { saveMemoriesBatch } = await import('@/lib/memory-utils');
    const memories = searchQueries.map((query: string) => ({
      content: query,
      userId: userId,
      source: 'conversation',
    }));
    
    await saveMemoriesBatch(memories);
  }

  const decisions = responseData.decisions || [];
  if (Array.isArray(decisions) && decisions.length > 0) {
      const decisionsRef = firestoreAdmin.collection('users').doc(userId).collection('decisions');
      const batch = firestoreAdmin.batch();
      decisions.forEach((d: any) => {
          if (d.topic && d.decision) {
              const docRef = decisionsRef.doc();
              batch.set(docRef, {
                  topic: d.topic,
                  decision: d.decision,
                  createdAt: FieldValue.serverTimestamp(),
                  source: 'memory_lane'
              });
          }
      });
      await batch.commit();
  }

  return responseData;
}
