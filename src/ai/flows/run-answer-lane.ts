'use server';

import { ai } from '@/ai/genkit';
import { firestoreAdmin, admin } from '@/lib/firebase-admin';
import { searchHistory } from '@/lib/vector';
import { MessageContent } from 'openai/resources/chat/completions';
import { z } from 'zod';
import { Artifact } from '@/lib/types';
import { generateEmbedding } from '@/lib/vector';

const AnswerLaneInputSchema = z.object({
  userId: z.string(),
  message: z.string(),
  assistantMessageId: z.string(),
});

const AnswerLaneOutputSchema = z.object({
  answer: z.string(),
});

async function extractAndSaveArtifact(rawResponse: string, userId: string): Promise<{ cleanResponse: string; artifactId?: string }> {
    const artifactRegex = /<artifact\s+title="([^"]+)"\s+type="([^"]+)">([\s\S]*?)<\/artifact>/;
    const match = rawResponse.match(artifactRegex);
  
    if (!match) {
      return { cleanResponse: rawResponse };
    }
  
    const [, title, type, content] = match;
    const artifactType = type === 'code' ? 'code' : 'markdown';
    
    const artifactData: Omit<Artifact, 'id'> = {
        userId: userId,
        title: title,
        type: artifactType,
        content: content.trim(),
        version: 1,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };
  
    const artifactRef = await firestoreAdmin.collection('artifacts').add(artifactData);
  
    const citation = `[Artifact Created: ${title}]`;
    const cleanResponse = rawResponse.replace(artifactRegex, `\n${citation}\n`);
  
    return { cleanResponse, artifactId: artifactRef.id };
}

export async function runAnswerLane(
  input: z.infer<typeof AnswerLaneInputSchema>
): Promise<z.infer<typeof AnswerLaneOutputSchema>> {
  const answerFlow = ai.defineFlow(
    {
      name: 'runAnswerLaneFlow',
      inputSchema: AnswerLaneInputSchema,
      outputSchema: AnswerLaneOutputSchema,
    },
    async ({ userId, message, assistantMessageId }) => {
        const assistantMessageRef = firestoreAdmin.collection('users').doc(userId).collection('history').doc(assistantMessageId);

        const logProgress = async (step: string) => {
            try {
                await assistantMessageRef.update({
                    progress_log: admin.firestore.FieldValue.arrayUnion(step)
                });
            } catch (e) {
                console.warn("Could not log progress.", e);
            }
        };

        try {
            await logProgress('Analyzing context...');
            const settingsDoc = await firestoreAdmin.collection('settings').doc(userId).get();
            const settings = { active_model: 'gpt-4o', reply_style: 'detailed', system_prompt_override: '', ...settingsDoc.data() };
            
            await logProgress('Searching memory...');
            const searchResults = await searchHistory(message, userId);
            await logProgress(`Found ${searchResults.length} relevant memories.`);
            
            const retrievedHistory = searchResults.length > 0 
              ? searchResults.map(r => `- [ID: ${r.id}] ${r.text}`).join('\n')
              : "No relevant history found.";

            const systemPrompt = settings.system_prompt_override || `You are a helpful assistant. Use the following History to answer the user. Reply style must be: ${settings.reply_style}. **Rule:** If the answer is not in the history, say 'I cannot find that in our history'. Do not hallucinate. If the user asks for a substantial standalone output (like a code file, a blog post, or a project plan), you must output it inside XML tags: <artifact title="Filename.ext" type="code|markdown">... content ...</artifact>`;
            
            await logProgress('Drafting response...');
            const completion = await ai.generate({
                model: `googleai/${settings.active_model}`,
                prompt: `${systemPrompt}\n\nHistory:\n${retrievedHistory}\n\nUser Question: "${message}"`,
            });
            const rawAIResponse = completion.text;

            await logProgress('Finalizing and saving...');
            const { cleanResponse } = await extractAndSaveArtifact(rawAIResponse, userId);
            
            // Also save the AI response as a memory
            const embedding = await generateEmbedding(cleanResponse);
            
            await assistantMessageRef.update({
                content: cleanResponse,
                embedding: embedding,
                status: 'complete',
                progress_log: admin.firestore.FieldValue.arrayUnion('Done.'),
            });
    
            return { answer: cleanResponse };

        } catch(error: any) {
            console.error("Error in Answer Lane: ", error);
            await assistantMessageRef.update({
                content: "Sorry, I encountered an error while processing your request.",
                status: 'error',
                progress_log: admin.firestore.FieldValue.arrayUnion('Error.'),
            });
            return { answer: "Sorry, an error occurred." };
        }
    }
  );

  return answerFlow(input);
}