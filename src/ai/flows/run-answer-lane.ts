
'use server';

import { ai } from '@/ai/genkit';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { Artifact } from '@/lib/types';
import { generateEmbedding } from '@/lib/vector';
import OpenAI from 'openai';
import { FieldValue } from 'firebase-admin/firestore';
import { textEmbedding3Small } from '@genkit-ai/google-genai';
import { trackEvent } from '@/lib/analytics';

// Lazy initialization to avoid build-time errors
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Please set it in your environment variables.');
  }
  return new OpenAI({ apiKey });
}

const AnswerLaneInputSchema = z.object({
  userId: z.string(),
  message: z.string(),
  assistantMessageId: z.string(),
  threadId: z.string(), // Pass threadId for context
});

const AnswerLaneOutputSchema = z.object({
  answer: z.string(),
});

async function extractAndSaveArtifact(rawResponse: string, userId: string): Promise<{ cleanResponse: string; artifactId?: string }> {
    const firestoreAdmin = getFirestoreAdmin();
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
  
    // Track analytics
    await trackEvent(userId, 'artifact_created', { artifactType, title });
  
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
    async ({ userId, message, assistantMessageId, threadId }) => {
        const firestoreAdmin = getFirestoreAdmin();
        const assistantMessageRef = firestoreAdmin.collection('history').doc(assistantMessageId);

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
            
            // --- SHORT-TERM MEMORY: Fetch recent conversation ---
            await logProgress('Recalling conversation...');
            const historySnapshot = await firestoreAdmin
                .collection('history')
                .where('threadId', '==', threadId)
                .orderBy('createdAt', 'desc')
                .limit(6) // Get last 6 messages (incl. current user message)
                .get();

            const recentHistory = historySnapshot.docs
                .reverse() // Correct chronological order
                .map(doc => {
                    const data = doc.data();
                    return `${data.role === 'user' ? 'User' : 'Assistant'}: ${data.content}`;
                })
                .join('\n');

            // --- LONG-TERM MEMORY: Vector Search using Firestore Admin SDK ---
            await logProgress('Searching memory...');
            const queryEmbedding = await generateEmbedding(message);
            const historyCollection = firestoreAdmin.collection('history');
            const vectorQuery = historyCollection
                .where('userId', '==', userId)
                .findNearest('embedding', queryEmbedding, {
                    limit: 5,
                    distanceMeasure: 'COSINE'
                });
            const relevantDocsSnapshot = await vectorQuery.get();
            const docs = relevantDocsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id, distance: doc.distance }));

            await logProgress(`Found ${docs.length} relevant memories.`);
            
            const retrievedHistory = docs.length > 0 
              ? docs.map(d => `- ${d.content}`).join("\n")
              : "No relevant history found.";
            
            // --- PROMPT CONSTRUCTION ---
            const finalSystemPrompt = settings.system_prompt_override || `You are a helpful AI assistant. Use the provided context to answer questions. If the context is empty or irrelevant, use your general knowledge.

--- LONG TERM MEMORY (User's Past) ---
${retrievedHistory}

--- SHORT TERM MEMORY (Current Conversation) ---
${recentHistory}

--- INSTRUCTION ---
Based on ALL the context above, answer the User's last message. If the answer is in the Short Term Memory, use that directly.
`;
            
            await logProgress('Drafting response...');
            const completion = await openai.chat.completions.create({
                model: settings.active_model as any,
                messages: [
                    { role: 'system', content: finalSystemPrompt },
                    { role: 'user', content: message } 
                ],
            });
            const rawAIResponse = completion.choices[0].message.content || '';

            await logProgress('Finalizing and saving...');
            const { cleanResponse } = await extractAndSaveArtifact(rawAIResponse, userId);
            
            const embedding = await generateEmbedding(cleanResponse);
            
            await assistantMessageRef.update({
                content: cleanResponse,
                embedding: embedding,
                status: 'complete',
                userId: userId,
                progress_log: FieldValue.arrayUnion('Done.'),
            });
    
            return { answer: cleanResponse };

        } catch(error: any) {
            console.error("Error in Answer Lane: ", error);
            await assistantMessageRef.update({
                content: "Sorry, I encountered an error while processing your request.",
                status: 'error',
                userId: userId,
                progress_log: FieldValue.arrayUnion('Error.'),
            });
            return { answer: "Sorry, an error occurred." };
        }
    }
  );

  return answerFlow(input);
}
