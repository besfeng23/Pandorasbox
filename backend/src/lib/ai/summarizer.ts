import { completeInference } from '@/lib/sovereign/inference';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Summarizes a conversation thread into a concise title (3-5 words).
 * Uses local inference to avoid external API costs.
 */
export async function summarizeThreadTitle(
    threadId: string,
    userId: string,
    startContext: string
) {
    try {
        console.log(`[Summarizer] Generating title for thread ${threadId}...`);

        // Construct a focused system prompt for the local model
        const messages = [
            {
                role: 'system' as const,
                content: `You are an expert summarizer. 
Task: Generate a short, specific title (3-5 words) for this conversation.
Rules:
- Do not use quotes.
- Do not add "Title:" prefix.
- Be specific (e.g., "React State Refactor" instead of "Coding Help").
- Initial Context provided below.`
            },
            {
                role: 'user' as const,
                content: `Context:\n${startContext.substring(0, 1000)}\n\nTitle:`
            }
        ];

        // Use completeInference (vLLM/Ollama)
        const title = await completeInference(messages, 0.3);
        const cleanTitle = title.replace(/['"]/g, '').replace(/^Title:\s*/i, '').trim();

        if (cleanTitle) {
            const db = getFirestoreAdmin();
            await db.doc(`users/${userId}/threads/${threadId}`).update({
                title: cleanTitle,
                updatedAt: FieldValue.serverTimestamp()
            });
            console.log(`[Summarizer] Set title for ${threadId}: "${cleanTitle}"`);
        }

    } catch (error) {
        console.warn(`[Summarizer] Failed to generate title:`, error);
    }
}
