'use server';

import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { generateEmbedding, searchHistory, searchMemories } from '@/lib/vector';
import { chatCompletion } from '@/server/inference-client';
import { FieldValue } from 'firebase-admin/firestore';
import { trackEvent } from '@/lib/analytics';

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
    const { userId, message, assistantMessageId, threadId } = input;
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
        const settings = { reply_style: 'detailed', system_prompt_override: '', ...settingsDoc.data() };
        
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

        // --- LONG-TERM MEMORY: Vector Search ---
        await logProgress('Searching memory...');
        
        const [historyResults, memoriesResults] = await Promise.all([
            searchHistory(message, userId).catch(err => {
                console.warn('[AnswerLane] History search failed:', err);
                return [];
            }),
            searchMemories(message, userId, 'universe', 10).catch(err => {
                console.warn('[AnswerLane] Memories search failed:', err);
                return [];
            })
        ]);
        
        const allResults = [...historyResults, ...memoriesResults]
            .sort((a, b) => (b.score || 0) - (a.score || 0))
            .slice(0, 10);

        await logProgress(`Found ${allResults.length} relevant memories.`);
        
        const insightMemories = allResults.filter((r: any) => r.type === 'insight');
        const regularMemories = allResults.filter((r: any) => r.type !== 'insight');
        
        const formatMemory = (d: any, idx: number, isInsight: boolean) => {
          const relevance = (d.score * 100).toFixed(0);
          const label = isInsight ? `INSIGHT ${idx + 1}` : `MEMORY ${idx + 1}`;
          const emphasis = isInsight ? '⭐ PRIORITIZE THIS - LEARNED PATTERN ⭐' : '';
          return `=== ${label} (${relevance}% RELEVANT) ${emphasis} ===\n${d.text}\n=== END ${label} ===`;
        };
        
        const retrievedHistory = allResults.length > 0 
          ? [
              ...insightMemories.map((d, idx) => formatMemory(d, idx + 1, true)),
              ...regularMemories.map((d, idx) => formatMemory(d, insightMemories.length + idx + 1, false)),
            ].join("\n\n")
          : "(No memories matched this specific query.)";
        
        const memoryUsageInstructions = allResults.length > 0 
          ? `YOU HAVE ${allResults.length} RELEVANT MEMORIES ABOVE. YOU MUST USE THEM IN YOUR RESPONSE.
Reference specific memories and PRIORITIZE INSIGHT MEMORIES (marked with ⭐).`
          : `Use general context from past conversations if available.`;
        
        const finalSystemPrompt = settings.system_prompt_override || `You are Pandora, a helpful AI assistant with FULL ACCESS to the user's long-term memory system.

--- LONG TERM MEMORY ---
${retrievedHistory}

--- SHORT TERM MEMORY ---
${recentHistory}

--- REQUIREMENTS ---
${memoryUsageInstructions}
`;
        
        await logProgress('Drafting response...');
        
        const completion = await chatCompletion({
            messages: [
                { role: 'system', content: finalSystemPrompt },
                { role: 'user', content: message } 
            ],
            temperature: 0.7
        });

        const rawAIResponse = completion.choices[0].message.content || '';

        await logProgress('Finalizing and saving...');
        const { cleanResponse } = await extractAndSaveArtifact(rawAIResponse, userId);

        // --- SELF-EVALUATION ---
        let lowConfidenceTopic: string | null = null;
        try {
            const evalPrompt = `You are an evaluation model. Rate confidence from 0.0 to 1.0 and extract core topic.\nRespond ONLY as JSON: {"confidence": number, "topic": string}`;

            const evalCompletion = await chatCompletion({
                messages: [
                    { role: 'system', content: evalPrompt },
                    {
                        role: 'user',
                        content: `User question:\n${message}\n\nRetrieved memories:\n${retrievedHistory.slice(0, 2000)}\n\nAnswer:\n${cleanResponse.slice(0, 2000)}`,
                    },
                ],
                temperature: 0.1
            });
            
            const evalText = evalCompletion.choices[0].message.content || '{}';
            const jsonMatch = evalText.match(/\{[\s\S]*\}/);
            const evalData = JSON.parse(jsonMatch ? jsonMatch[0] : evalText);
            
            if (evalData.confidence < 0.6 && evalData.topic) {
                lowConfidenceTopic = evalData.topic;
            }
        } catch (evalError) {
            console.warn('[AnswerLane] Evaluation failed:', evalError);
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
        const userFacingError = "Sorry, I encountered an error while processing your request.";
        
        try {
            await assistantMessageRef.update({
                content: userFacingError,
                status: 'error',
                userId: userId,
                progress_log: FieldValue.arrayUnion(`Error: ${error.message?.substring(0, 100)}`),
            });
        } catch (updateError) {
            console.error("Failed to update error message:", updateError);
        }
        return { answer: userFacingError };
    }
}
