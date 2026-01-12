'use server';

import { ai } from '@/ai/genkit';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { generateEmbedding, searchHistory, searchMemories } from '@/lib/vector';
import OpenAI from 'openai';
import { FieldValue } from 'firebase-admin/firestore';
import { trackEvent } from '@/lib/analytics';
import { ChatCompletionMessageParam } from 'openai/resources/index.mjs';

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
  imageBase64: z.string().nullable().optional(),
  audioUrl: z.string().optional(), // Added audioUrl
  assistantMessageId: z.string(),
  threadId: z.string(), 
});

const AnswerLaneOutputSchema = z.object({
  answer: z.string(),
  lowConfidenceTopic: z.string().nullable().optional(),
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
    async ({ userId, message, imageBase64, audioUrl, assistantMessageId, threadId }) => {
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
            let settings = { active_model: 'gemini-1.5-pro', reply_style: 'detailed', system_prompt_override: '', ...settingsDoc.data() };
            
            // Override model if audio is present (must use Gemini)
            if (audioUrl && !settings.active_model.includes('gemini')) {
                console.log('[AnswerLane] Audio present, switching to Gemini 1.5 Pro');
                settings.active_model = 'gemini-1.5-pro';
            }

            const isGemini = settings.active_model.includes('gemini');
            
            // --- SHORT-TERM MEMORY: Fetch recent conversation ---
            await logProgress('Recalling conversation...');
            const recentHistorySnapshot = await firestoreAdmin
                .collection('history')
                .where('threadId', '==', threadId)
                .orderBy('createdAt', 'desc')
                .limit(6) 
                .get();

            const recentHistory = recentHistorySnapshot.docs
                .reverse() 
                .map(doc => {
                    const data = doc.data();
                    return `${data.role === 'user' ? 'User' : 'Assistant'}: ${data.content}`;
                })
                .join('\n');

            // --- LONG-TERM MEMORY: Vector Search ---
            await logProgress('Searching memory...');
            
            // Adaptive Retrieval
            const retrievalLimit = isGemini ? 100 : 5;
            
            const [historyResults, memoriesResults] = await Promise.all([
                searchHistory(message || 'context', userId).catch(err => {
                    console.warn('[AnswerLane] History search failed:', err);
                    return [];
                }),
                searchMemories(message || 'context', userId, retrievalLimit).catch(err => {
                    console.warn('[AnswerLane] Memories search failed:', err);
                    return [];
                })
            ]);

            // Phase 4: Knowledge Graph Integration
            try {
                const { extractKnowledgeFromText } = await import('@/lib/knowledge-graph');
                await extractKnowledgeFromText(userId, message || 'User Interaction', 'conversation', `Thread: ${threadId}`).catch(err => {
                    console.warn('[AnswerLane] Knowledge extraction failed (non-critical):', err);
                });
            } catch (err) {
                console.warn('[AnswerLane] Knowledge extraction error (non-critical):', err);
            }
            
            console.log(`[AnswerLane] Memory search results: history=${historyResults.length}, memories=${memoriesResults.length}`);
            
            const allCandidates = [...historyResults, ...memoriesResults];
            let topResults = allCandidates;

            // Re-ranking (Only if using OpenAI for now, or skip if Gemini 1.5 Pro which has huge context)
            // If Gemini 1.5 Pro, we might just dump everything in?
            // "The app switches to 'Deep Context Mode.' It retrieves the top 50-100 memories plus full documents."
            // So for Gemini, we don't necessarily re-rank down to 5. We keep them all (or up to context limit).
            // For GPT-4o, we re-rank.
            
            if (!isGemini && allCandidates.length > 3) {
                 // Existing re-ranking logic for GPT-4o
                 try {
                    await logProgress('Re-ranking memories...');
                    const candidatesList = allCandidates.map((c, i) => ({
                        index: i,
                        text: c.text.substring(0, 300) 
                    }));

                    const rankingPrompt = `You are a relevance ranking system. 
                    User Query: "${message}"
                    
                    Rank the following memory snippets by relevance to the query. 
                    Return a JSON object with a property "indices" containing the indices of the top 5 most relevant snippets, in order of relevance.
                    
                    Snippets:
                    ${JSON.stringify(candidatesList)}`;

                    const rankingCompletion = await getOpenAI().chat.completions.create({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'system', content: rankingPrompt }],
                        response_format: { type: 'json_object' },
                        temperature: 0,
                    });

                    const rankingData = JSON.parse(rankingCompletion.choices[0].message.content || '{}');
                    const topIndices = rankingData.indices;

                    if (Array.isArray(topIndices) && topIndices.length > 0) {
                        topResults = topIndices
                            .map((idx: any) => allCandidates[Number(idx)])
                            .filter(Boolean); 
                        console.log(`[AnswerLane] Re-ranked ${allCandidates.length} candidates down to ${topResults.length}`);
                    }
                } catch (rankingError) {
                    console.warn('[AnswerLane] Re-ranking failed, falling back to vector scores:', rankingError);
                    topResults = allCandidates.sort((a, b) => (b.score || 0) - (a.score || 0));
                }
                
                // Limit to 5 for GPT-4o
                topResults = topResults.slice(0, 5);
            } else if (isGemini) {
                // For Gemini, we take top 100 (already limited by searchMemories call which used retrievalLimit)
                // We just sort by score.
                topResults = allCandidates.sort((a, b) => (b.score || 0) - (a.score || 0));
                // Ensure we don't exceed some sanity limit if searchHistory added more
                topResults = topResults.slice(0, 100);
            }

            await logProgress(`Found ${topResults.length} relevant memories.`);
            
            const insightMemories = topResults.filter((r: any) => r.type === 'insight');
            const regularMemories = topResults.filter((r: any) => r.type !== 'insight');
            
            const formatMemory = (d: any, idx: number, isInsight: boolean) => {
              const relevance = (d.score * 100).toFixed(0);
              const label = isInsight ? `INSIGHT ${idx + 1}` : `MEMORY ${idx + 1}`;
              const emphasis = isInsight ? '⭐ PRIORITIZE THIS - LEARNED PATTERN ⭐' : '';
              return `=== ${label} (${relevance}% RELEVANT) ${emphasis} ===\n${d.text}\n=== END ${label} ===`;
            };
            
            const retrievedHistory = topResults.length > 0 
              ? [
                  ...insightMemories.map((d, idx) => formatMemory(d, idx + 1, true)),
                  ...regularMemories.map((d, idx) => formatMemory(d, insightMemories.length + idx + 1, false)),
                ].join("\n\n")
              : "(No memories matched this specific query, but you DO have access to the user's memory system.)";
            
            const memoryUsageInstructions = topResults.length > 0 
              ? `YOU HAVE ${topResults.length} RELEVANT MEMORIES ABOVE. YOU MUST USE THEM IN YOUR RESPONSE.`
              : `You have access to the user's memory system.`;
            
            const finalSystemPrompt = settings.system_prompt_override || `You are Pandora, a helpful AI assistant with FULL ACCESS to the user's long-term memory system.
            
--- LONG TERM MEMORY ---
${retrievedHistory}

--- SHORT TERM MEMORY ---
${recentHistory}

--- REQUIREMENTS ---
${memoryUsageInstructions}
`;
            
            await logProgress('Drafting response...');
            
            let cleanResponse = '';
            
            if (isGemini) {
                // Use Vertex AI / Genkit
                const prompt: any[] = [];
                prompt.push({ text: finalSystemPrompt });
                
                if (imageBase64) {
                    prompt.push({ media: { url: imageBase64 } });
                    prompt.push({ text: message || "Describe this image." });
                } else if (audioUrl) {
                    prompt.push({ media: { url: audioUrl } });
                    prompt.push({ text: message || "Listen to this audio and respond." });
                } else {
                    prompt.push({ text: message });
                }
                
                const modelName = `vertexai/${settings.active_model}`;
                
                const completion = await ai.generate({
                    model: modelName,
                    prompt: prompt,
                    // Enable Grounding with Google Search
                    config: {
                         googleSearchRetrieval: {
                             disableAttribution: false // Enable attribution
                         }
                    }
                });
                
                const rawAIResponse = completion.text;
                const result = await extractAndSaveArtifact(rawAIResponse, userId);
                cleanResponse = result.cleanResponse;
                
            } else {
                // Legacy OpenAI path
                const openai = getOpenAI();
                const messages: ChatCompletionMessageParam[] = [
                    { role: 'system', content: finalSystemPrompt },
                ];

                if (imageBase64) {
                    messages.push({
                        role: 'user',
                        content: [
                            { type: 'text', text: message },
                            { type: 'image_url', image_url: { url: imageBase64 } }
                        ]
                    });
                } else {
                    messages.push({ role: 'user', content: message });
                }

                const completion = await openai.chat.completions.create({
                    model: settings.active_model as any,
                    messages: messages,
                });
                const rawAIResponse = completion.choices[0].message.content || '';
                const result = await extractAndSaveArtifact(rawAIResponse, userId);
                cleanResponse = result.cleanResponse;
            }

            // --- SELF-EVALUATION (Keep using OpenAI or switch to Gemini? I'll keep OpenAI for consistency of evaluation format for now or skip) ---
            // If we want to use Gemini for eval, we can.
            
            const embedding = await generateEmbedding(cleanResponse);
            
            await assistantMessageRef.update({
                content: cleanResponse,
                embedding: embedding,
                status: 'complete',
                userId: userId,
                threadId: threadId,
                progress_log: FieldValue.arrayUnion('Done.'),
            });
    
            console.log(`[AnswerLane] Successfully completed message ${assistantMessageId}`);
            return { answer: cleanResponse };

        } catch(error: any) {
            console.error("[AnswerLane] Error in Answer Lane: ", error);
            const errorMessage = error?.message || String(error) || 'Unknown error';
            const fullError = error?.stack || errorMessage;
            
            try {
                await assistantMessageRef.update({
                    content: `Sorry, I encountered an error: ${errorMessage.substring(0, 200)}. Please try again.`,
                    status: 'error',
                    userId: userId,
                    threadId: threadId,
                    progress_log: FieldValue.arrayUnion(`Error: ${errorMessage.substring(0, 200)}`),
                });
                console.log(`[AnswerLane] Marked message ${assistantMessageId} as error`);
            } catch (updateError) {
                console.error("[AnswerLane] Failed to update error message:", updateError);
                // Try to at least set status
                try {
                    await assistantMessageRef.set({
                        id: assistantMessageId,
                        role: 'assistant',
                        content: `Error: ${errorMessage.substring(0, 200)}`,
                        status: 'error',
                        userId: userId,
                        threadId: threadId,
                        createdAt: FieldValue.serverTimestamp(),
                    }, { merge: true });
                } catch (setError) {
                    console.error("[AnswerLane] Failed to set error message:", setError);
                }
            }
            return { answer: "Error processing request." };
        }
    }
  );

  return answerFlow(input);
}
