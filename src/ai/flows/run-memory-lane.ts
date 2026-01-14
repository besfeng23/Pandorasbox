'use server';

import { ai } from '@/ai/genkit';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { generateEmbedding } from '@/lib/vector';
import { trackEvent } from '@/lib/analytics';
import { FieldValue } from 'firebase-admin/firestore';


const MemoryLaneInputSchema = z.object({
  userId: z.string(),
  message: z.string(),
  messageId: z.string().optional(),
  imageBase64: z.string().nullable(),
  audioUrl: z.string().optional(),
  source: z.string(),
});

const MemoryLaneOutputSchema = z.object({
  new_context_note: z.string().optional(),
  search_queries: z.array(z.string()).optional(),
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
    async ({ userId, message, messageId, imageBase64, audioUrl, source }) => {
      const firestoreAdmin = getFirestoreAdmin();
      const [settingsDoc, contextDoc] = await Promise.all([
        firestoreAdmin.collection('settings').doc(userId).get(),
        firestoreAdmin.collection('users').doc(userId).collection('state').doc('context').get(),
      ]);

      const settings = { active_model: 'gemini-1.5-pro', ...settingsDoc.data() };
      const currentContext = contextDoc.exists ? contextDoc.data()?.note : 'No context yet.';
      
      // 0. The Bouncer: Semantic Gating
      // Skip expensive processing for short, low-value messages unless an image is present
      // For audio, we always process or use Flash to check.
      let isWorthRemembering = true;
      
      // If we have text message (and no image/audio), check length
      if (!imageBase64 && !audioUrl && message) {
         if (message.length < 15) {
             // Very short messages are usually not worth it (e.g. "ok", "thanks")
             isWorthRemembering = false;
         } else if (message.length < 100) {
             // Check with Bouncer
             try {
                // Use Gemini Flash for cheap check
                const bouncerResponse = await ai.generate({
                    model: 'vertexai/gemini-1.5-flash',
                    prompt: `Analyze the following message. Does it contain factual information, user preferences, or distinct context worth remembering? Reply TRUE or FALSE.\n\nMessage: "${message}"`,
                    config: { temperature: 0, maxOutputTokens: 5 }
                });
                
                const bouncerText = bouncerResponse.text;
                isWorthRemembering = bouncerText.toUpperCase().includes('TRUE');
             } catch (e) {
                 console.warn('[MemoryLane] Bouncer check failed, defaulting to TRUE:', e);
                 isWorthRemembering = true;
             }
         }
      } else if (audioUrl) {
          // For audio, we can also check with Flash, but let's assume if user sends audio it might be important.
          // Or we can verify. Let's verify with Flash as it supports audio.
          try {
              const bouncerResponse = await ai.generate({
                  model: 'vertexai/gemini-1.5-flash',
                  prompt: [
                      { text: `Listen to this audio. Does it contain factual information, user preferences, or distinct context worth remembering? Reply TRUE or FALSE.` },
                      { media: { url: audioUrl } }
                  ],
                  config: { temperature: 0, maxOutputTokens: 5 }
              });
              const bouncerText = bouncerResponse.text;
              isWorthRemembering = bouncerText.toUpperCase().includes('TRUE');
          } catch (e) {
              console.warn('[MemoryLane] Audio Bouncer check failed, defaulting to TRUE:', e);
              isWorthRemembering = true;
          }
      }

      if (!isWorthRemembering) {
        console.log('[MemoryLane] Bouncer rejected message:', message || 'Audio/Image');
        return {
            new_context_note: currentContext, 
            search_queries: [],
        };
      }

      // 1. Async Embedding Generation
      // If we are here, it's worth remembering.
      if (messageId && message) {
          try {
              // Generate embedding for text
              // Note: For audio, we might want to transcribe it first or embed the audio if we supported multimodal embeddings.
              // For now, we only embed text. If message is empty (audio-only), we might skip embedding or use description later.
              // If message is present, we embed it.
              const embedding = await generateEmbedding(message);
              await firestoreAdmin.collection('history').doc(messageId).update({
                  embedding: embedding
              });
              await trackEvent(userId, 'embedding_generated');
          } catch (embedError) {
              console.error('[MemoryLane] Failed to generate embedding:', embedError);
          }
      }

      // 2. Memory Extraction & Context Update
      // Use active model (Gemini 1.5 Pro) or fallback
      
      let systemPrompt = `You are a memory manager. Your job is to extract key information from user messages and create searchable memories.`;
      
      const prompt: any[] = [];
      prompt.push({ text: systemPrompt });
      
      if (imageBase64) {
          prompt.push({ text: `Analyze the image in extreme detail.` });
          prompt.push({ media: { url: imageBase64 } });
      }
      if (audioUrl) {
          prompt.push({ text: `Analyze the audio content.` });
          prompt.push({ media: { url: audioUrl } });
      }
      
      prompt.push({ text: `Current Context: "${currentContext}"\n\nUser Message: "${message || '(See attached media)'}"` });
      prompt.push({ text: `
Extract ALL important information including:
- User preferences, settings, or choices
- Personal facts, names, or details about the user
- Instructions or guidelines the user provides
- Character descriptions, voice instructions, or style preferences
- Important context that should be remembered for future conversations

Return a JSON object with:
- "new_context_note" (string): An updated context note that summarizes the conversation so far
- "search_queries" (array of strings): Extract 3-10 searchable memory items. Each should be a concise phrase (5-20 words).
- "image_description" (string, optional): If image provided.
- "audio_transcript" (string, optional): If audio provided.
` });

      try {
          const modelName = settings.active_model.includes('gemini') ? `vertexai/${settings.active_model}` : 'vertexai/gemini-1.5-pro';
          
          const completion = await ai.generate({
              model: modelName,
              prompt: prompt,
              output: { format: 'json' }
          });
          
          const responseData = completion.output; // Genkit returns typed output if schema provided, or raw json
          // We didn't provide schema to generate(), so it's likely any or we parse text.
          // Genkit output() helper usually handles JSON parsing if format is json.
          
          // Phase 4: Extract knowledge from user message to build knowledge graph
          try {
            const { extractKnowledgeFromText } = await import('@/lib/knowledge-graph');
            const textToExtract = message || responseData?.audio_transcript || responseData?.image_description || '';
            if (textToExtract) {
                await extractKnowledgeFromText(userId, textToExtract, 'memory_lane', 'User message').catch(err => {
                console.warn('[MemoryLane] Knowledge extraction failed (non-critical):', err);
                });
            }
          } catch (err) {
            console.warn('[MemoryLane] Knowledge extraction error (non-critical):', err);
          }

          if (responseData) {
              const stateCollection = firestoreAdmin.collection('users').doc(userId).collection('state');
              if (responseData.new_context_note) {
                  await stateCollection.doc('context').set({ note: responseData.new_context_note }, { merge: true });
              }
              
              const searchQueries = responseData.search_queries || [];
              if (Array.isArray(searchQueries) && searchQueries.length > 0) {
                const { saveMemoriesBatch } = await import('@/lib/memory-utils');
                const memories = searchQueries.map((query: string) => ({
                  content: query,
                  userId: userId,
                  source: 'conversation',
                }));
                
                await saveMemoriesBatch(memories);
              }
              
              // If we have a transcript from audio, update the history message?
              if (responseData.audio_transcript && messageId) {
                  // We could update the message content if it was empty
                   await firestoreAdmin.collection('history').doc(messageId).update({
                      content: responseData.audio_transcript, // Or store in separate field?
                      transcript: responseData.audio_transcript
                  });
                  // Also generate embedding for the transcript if we didn't before
                  if (!message && responseData.audio_transcript) {
                       const embedding = await generateEmbedding(responseData.audio_transcript);
                       await firestoreAdmin.collection('history').doc(messageId).update({
                          embedding: embedding
                       });
                  }
              }
              
              return responseData as any;
          }
      } catch (error) {
          console.error('[MemoryLane] AI Generation failed:', error);
          // Fallback or retry?
      }

      return { new_context_note: currentContext, search_queries: [] };
    }
  );

  return memoryFlow(input);
}
