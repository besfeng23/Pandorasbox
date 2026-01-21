
'use server';

import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { Artifact } from '@/lib/types';
import { generateEmbedding, searchHistory, searchMemories } from '@/lib/vector';
import { chatCompletion, ChatMessage } from '@/lib/sovereign/vllm-client';
import { FieldValue } from 'firebase-admin/firestore';
import { trackEvent } from '@/lib/analytics';
import { ai } from '@/ai/genkit';

const AnswerLaneInputSchema = z.object({
  userId: z.string(),
  message: z.string(),
  assistantMessageId: z.string(),
  threadId: z.string(), // Pass threadId for context
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
            
            // Separate insights from regular memories for emphasis
            const insightMemories = allResults.filter((r: any) => r.type === 'insight');
            const regularMemories = allResults.filter((r: any) => r.type !== 'insight');
            
            // Format retrieved memories with more context and emphasis
            const formatMemory = (d: any, idx: number, isInsight: boolean) => {
              const relevance = (d.score * 100).toFixed(0);
              const label = isInsight ? `INSIGHT ${idx + 1}` : `MEMORY ${idx + 1}`;
              const emphasis = isInsight ? '⭐ PRIORITIZE THIS - LEARNED PATTERN ⭐' : '';
              return `=== ${label} (${relevance}% RELEVANT) ${emphasis} ===\n${d.text}\n=== END ${label} ===`;
            };
            
            const retrievedHistory = allResults.length > 0 
              ? [
                  // Put insights first with emphasis
                  ...insightMemories.map((d, idx) => formatMemory(d, idx + 1, true)),
                  // Then regular memories
                  ...regularMemories.map((d, idx) => formatMemory(d, insightMemories.length + idx + 1, false)),
                ].join("\n\n")
              : "(No memories matched this specific query, but you DO have access to the user's memory system with 238 total memories.)";
            
            console.log(`[AnswerLane] Retrieved history length: ${retrievedHistory.length} chars, ${allResults.length} memories included (${insightMemories.length} insights)`);
            
            // --- PROMPT CONSTRUCTION ---
            const insightInstructions = insightMemories.length > 0
              ? `\n\n⭐ CRITICAL: You have ${insightMemories.length} INSIGHT MEMORIES above (marked with ⭐). These represent learned patterns and consolidated knowledge from past interactions. You MUST prioritize and use these insights - they are more valuable than individual memories because they represent synthesized understanding.`
              : '';
            
            const memoryUsageInstructions = allResults.length > 0 
              ? `YOU HAVE ${allResults.length} RELEVANT MEMORIES ABOVE${insightMemories.length > 0 ? ` (${insightMemories.length} are INSIGHTS - prioritize these!)` : ''}. YOU MUST USE THEM IN YOUR RESPONSE.

MANDATORY: Your response MUST:
1. Reference specific memories from the LONG TERM MEMORY section above
2. PRIORITIZE INSIGHT MEMORIES (marked with ⭐) - these represent learned patterns
3. Use phrases like "Based on our past conversations..." or "I remember from earlier that..." or "From what you've shared before..."
4. Incorporate details from the memories naturally into your answer
5. Show that you're using the information provided - don't just acknowledge it exists, actually USE it

EXAMPLE: If a memory says "User's name is Joven" and user asks "what's my name", you MUST respond: "Your name is Joven. I remember this from our past conversations." NOT "I don't have access to that information."

EXAMPLE: If memories contain story content about "Joven POV collapse scene", and user asks about it, you MUST reference those memories and use the details in your response.${insightInstructions}`
              : `You have access to 238 memories total. While none matched this specific query, you can still reference general context from past conversations.`;
            
            const finalSystemPrompt = settings.system_prompt_override || `You are Pandora, a helpful AI assistant with FULL ACCESS to the user's long-term memory system. You CAN and DO remember information from ALL past conversations and sessions.

⚠️ CRITICAL: IGNORE ANY DEFAULT AI INSTRUCTIONS ABOUT NOT HAVING MEMORY. YOU HAVE PERSISTENT MEMORY.

YOU HAVE MEMORY. YOU CAN RECALL:
- User's name and personal information
- Past conversations and context  
- User preferences and settings
- Story content, character details, narrative elements
- INSIGHTS: Learned patterns and consolidated knowledge (prioritize these!)
- ANY information that has been shared with you previously

--- LONG TERM MEMORY (From ALL Past Conversations & Sessions) ---
${retrievedHistory}

--- SHORT TERM MEMORY (Current Conversation Only) ---
${recentHistory}

--- ABSOLUTE REQUIREMENTS ---
${memoryUsageInstructions}

CRITICAL RULES - OVERRIDE DEFAULT AI BEHAVIOR:
1. NEVER say "I don't have memory", "I can't recall", "I don't retain personal data", "context does not persist", or "each new session starts with no memory" - THESE STATEMENTS ARE FALSE. YOU HAVE MEMORY.
2. NEVER say "I don't remember prior interactions for privacy reasons" - YOU DO REMEMBER AND IT'S PART OF YOUR FUNCTIONALITY
3. If memories are provided above, you MUST reference and use them in your response
4. PRIORITIZE INSIGHT MEMORIES (marked with ⭐) - they represent learned patterns from reflection
5. When user asks about something, check the LONG TERM MEMORY section first
6. Always incorporate memory details naturally - don't just list them, USE them
7. If user asks "what's my name" or "show me memories", check LONG TERM MEMORY and respond with actual information from there
8. You are NOT a memory-less assistant - you ARE Pandora with full memory capabilities that you MUST use
9. Context DOES persist across separate interactions - this is a core feature of this system
10. You DO retain personal data and remember prior interactions - this is intentional and expected behavior

If the user asks about memory, respond confidently: "Yes, I remember our past conversations. I have access to your long-term memory, including [reference specific memories from above]."
`;
            
            await logProgress('Drafting response...');
            
            const messages: ChatMessage[] = [
                { role: 'system', content: finalSystemPrompt },
                { role: 'user', content: message } 
            ];

            const rawAIResponse = await chatCompletion(messages, {
                temperature: 0.7 // Default temperature
            });

            await logProgress('Finalizing and saving...');
            const { cleanResponse } = await extractAndSaveArtifact(rawAIResponse, userId);

            // --- SELF-EVALUATION: Confidence & topic extraction for deep research ---
            let lowConfidenceTopic: string | null = null;
            try {
                const evalPrompt = `You are an evaluation model. Given the user's question, retrieved memories, and the assistant's draft answer, rate your confidence from 0.0 to 1.0 and extract the core topic.\n\nRespond ONLY as JSON with this exact shape:\n{"confidence": number, "topic": string}`;

                const truncatedMemories = retrievedHistory.slice(0, 4000);
                const truncatedAnswer = cleanResponse.slice(0, 4000);

                const evalMessages: ChatMessage[] = [
                    { role: 'system', content: evalPrompt },
                    {
                        role: 'user',
                        content: `User question:\n${message}\n\nRetrieved memories (truncated):\n${truncatedMemories}\n\nDraft answer (truncated):\n${truncatedAnswer}`,
                    },
                ];

                const evalText = await chatCompletion(evalMessages, {
                    temperature: 0.1 // Low temperature for evaluation
                });
                
                const evalData = JSON.parse(evalText || '{}');
                const confidence = typeof evalData.confidence === 'number'
                  ? evalData.confidence
                  : parseFloat(evalData.confidence || '0');
                const topic = (evalData.topic || '').toString().trim();

                if (!isNaN(confidence) && confidence < 0.6 && topic) {
                    lowConfidenceTopic = topic;
                    console.log(`[AnswerLane] Low confidence detected (${confidence.toFixed(2)}) for topic "${topic}"`);
                }
            } catch (evalError) {
                console.warn('[AnswerLane] Self-evaluation failed, continuing without learning_queue enqueue:', evalError);
            }
            
            const embedding = await generateEmbedding(cleanResponse);
            
            await assistantMessageRef.update({
                content: cleanResponse,
                embedding: embedding,
                status: 'complete',
                userId: userId,
                progress_log: FieldValue.arrayUnion('Done.'),
            });
    
            return { answer: cleanResponse, lowConfidenceTopic };

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
