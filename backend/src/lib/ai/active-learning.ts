import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface ClarificationResult {
    needsClarification: boolean;
    question?: string;
}

/**
 * Evaluates if a user request is too ambiguous to fulfill accurately.
 * Prompts the user for more information rather than "guessing."
 */
export async function detectAmbiguity(query: string): Promise<ClarificationResult> {
    const ambiguityPrompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are the Uncertainty Detector for Pandora's Box.
Analyze the user's query. If it is underspecified, missing critical context, or highly ambiguous, ask for clarification.
If the query is clear, respond WITH ONLY the word "CLEAR".

EXAMPLES:
User: "Fix the bug" -> Needs clarification: "Which bug in which file are you referring to?"
User: "Tell me a joke" -> CLEAR
User: "Deploy it" -> Needs clarification: "Clarify what you want to deploy and to which environment."
`
        },
        { role: 'user', content: query }
    ];

    try {
        const rawResponse = await completeInference(ambiguityPrompt, 0.1);

        if (rawResponse.trim().toUpperCase() === 'CLEAR') {
            return { needsClarification: false };
        }

        return {
            needsClarification: true,
            question: rawResponse.trim()
        };

    } catch (error) {
        console.error('[ActiveLearning] Error:', error);
        return { needsClarification: false };
    }
}
