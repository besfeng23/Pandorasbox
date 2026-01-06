
'use server';

import { ai } from '@/ai/genkit';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { Artifact } from '@/lib/types';
import { generateEmbedding, searchHistory, searchMemories } from '@/lib/vector';
import OpenAI from 'openai';
import { FieldValue } from 'firebase-admin/firestore';
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
    
    const artifactData = {
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
            const recentHistorySnapshot = await firestoreAdmin
                .collection('history')
                .where('threadId', '==', threadId)
                .orderBy('createdAt', 'desc')
                .limit(6) // Get last 6 messages (incl. current user message)
                .get();

            const recentHistory = recentHistorySnapshot.docs
                .reverse() // Correct chronological order
                .map(doc => {
                    const data = doc.data();
                    return `${data.role === 'user' ? 'User' : 'Assistant'}: ${data.content}`;
                })
                .join('\n');

            // --- LONG-TERM MEMORY: Vector Search using existing helper functions ---
            // Search BOTH history and memories collections for global long-term memory
            await logProgress('Searching memory...');
            
            // Use existing searchHistory and searchMemories functions which have error handling
            const [historyResults, memoriesResults] = await Promise.all([
                searchHistory(message, userId).catch(err => {
                    console.warn('[AnswerLane] History search failed:', err);
                    return [];
                }),
                searchMemories(message, userId, 10).catch(err => {
                    console.warn('[AnswerLane] Memories search failed:', err);
                    console.error('[AnswerLane] Memory search error details:', err.message, err.stack);
                    return [];
                })
            ]);
            
            console.log(`[AnswerLane] Memory search results: history=${historyResults.length}, memories=${memoriesResults.length}`);
            
            // Combine results from both collections, prioritizing by score (higher = more relevant)
            const allResults = [...historyResults, ...memoriesResults]
                .sort((a, b) => (b.score || 0) - (a.score || 0))
                .slice(0, 10); // Take top 10 most relevant across both collections (increased from 5)

            await logProgress(`Found ${allResults.length} relevant memories (${historyResults.length} from history, ${memoriesResults.length} from memories).`);
            console.log(`[AnswerLane] Combined ${allResults.length} results. Top results:`, allResults.slice(0, 3).map(r => ({ text: r.text.substring(0, 50), score: r.score })));
            
            // Format retrieved memories with more context
            const retrievedHistory = allResults.length > 0 
              ? allResults.map((d, idx) => `[Memory ${idx + 1}, Relevance: ${(d.score * 100).toFixed(0)}%]\n${d.text}`).join("\n\n")
              : "(No memories matched this specific query, but you DO have access to the user's memory system.)";
            
            console.log(`[AnswerLane] Retrieved history length: ${retrievedHistory.length} chars, ${allResults.length} memories included`);
            
            // --- PROMPT CONSTRUCTION ---
            const finalSystemPrompt = settings.system_prompt_override || `You are Pandora, a helpful AI assistant with FULL ACCESS to the user's long-term memory system. You CAN and DO remember information from ALL past conversations and sessions.

IMPORTANT: You HAVE memory capabilities. You can recall:
- User's name and personal information
- Past conversations and context
- User preferences and settings
- Any information that has been shared with you previously

--- LONG TERM MEMORY (From ALL Past Conversations & Sessions) ---
${retrievedHistory}

--- SHORT TERM MEMORY (Current Conversation Only) ---
${recentHistory}

--- CRITICAL INSTRUCTIONS ---
1. You HAVE memory - you can remember things from past conversations. NEVER say you don't have memory or can't recall information.
2. If the user asks "what's my name" or "show me memories", check the LONG TERM MEMORY section above. If information is there, use it.
3. If the LONG TERM MEMORY section shows memories, you MUST reference them in your response. For example: "Based on our past conversations, I remember that..."
4. If no memories matched the current query but the user asks about memory, you can say: "I have access to your memory system. Let me search for that information..." and then provide what you find or ask clarifying questions.
5. Always be helpful and use the information available to you. You are NOT a memory-less assistant - you ARE Pandora with full memory capabilities.
`;
            
            await logProgress('Drafting response...');
            const openai = getOpenAI();
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
            const errorMessage = error?.message || String(error) || 'Unknown error';
            console.error("Error details: ", {
                message: errorMessage,
                stack: error?.stack,
                name: error?.name,
            });
            
            // Try to include more helpful error information
            let userFacingError = "Sorry, I encountered an error while processing your request.";
            if (errorMessage.includes('OPENAI_API_KEY')) {
                userFacingError = "Configuration error: OpenAI API key is not set. Please check your environment variables.";
            } else if (errorMessage.includes('findNearest') || errorMessage.includes('vector')) {
                userFacingError = "Memory search error: Vector search is not available. Please check your Firestore configuration.";
            }
            
            try {
                await assistantMessageRef.update({
                    content: userFacingError,
                    status: 'error',
                    userId: userId,
                    progress_log: FieldValue.arrayUnion(`Error: ${errorMessage.substring(0, 100)}`),
                });
            } catch (updateError) {
                console.error("Failed to update error message:", updateError);
            }
            return { answer: userFacingError };
        }
    }
  );

  return answerFlow(input);
}
