
'use server';

import { ai } from '@/ai/genkit';
import { firestoreAdmin } from '@/lib/firebase-admin';
import { searchHistory } from '@/lib/vector';
import { z } from 'zod';
import { Artifact } from '@/lib/types';
import { generateEmbedding } from '@/lib/vector';
import OpenAI from 'openai';
import { FieldValue } from 'firebase-admin/firestore';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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
        createdAt: FieldValue.serverTimestamp(),
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
                    progress_log: FieldValue.arrayUnion(step)
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

            const systemPrompt = settings.system_prompt_override || `You are a helpful AI assistant. Use the provided context to answer questions about the user's past. If the context is empty or irrelevant, ignore it and use your general knowledge to answer the question helpfully. Do not say 'I cannot find that' unless the user specifically asks to search for a missing record. If the user asks for a substantial standalone output (like a code file, a blog post, or a project plan), you must output it inside XML tags: <artifact title="Filename.ext" type="code|markdown">... content ...</artifact>`;
            
            await logProgress('Drafting response...');
            const completion = await openai.chat.completions.create({
                model: settings.active_model as any,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: `History:\n${retrievedHistory}\n\nUser Question: "${message}"` }
                ],
            });
            const rawAIResponse = completion.choices[0].message.content || '';

            await logProgress('Finalizing and saving...');
            const { cleanResponse } = await extractAndSaveArtifact(rawAIResponse, userId);
            
            const embedding = await generateEmbedding(cleanResponse);
            
            // CRITICAL: Ensure userId is stamped on the AI's message
            await assistantMessageRef.update({
                content: cleanResponse,
                embedding: embedding,
                status: 'complete',
                userId: userId, // Ensure userId is present
                progress_log: FieldValue.arrayUnion('Done.'),
            });
    
            return { answer: cleanResponse };

        } catch(error: any) {
            console.error("Error in Answer Lane: ", error);
            await assistantMessageRef.update({
                content: "Sorry, I encountered an error while processing your request.",
                status: 'error',
                userId: userId, // Also stamp userId on errors
                progress_log: FieldValue.arrayUnion('Error.'),
            });
            return { answer: "Sorry, an error occurred." };
        }
    }
  );

  return answerFlow(input);
}
