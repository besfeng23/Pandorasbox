import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface ThoughtBranch {
    path: string;
    score: number;
    critique: string;
}

/**
 * Explores multiple reasoning paths in parallel to find the most robust solution.
 * Uses JSON-enforced output for reliability.
 */
export async function exploreTreeOfThoughts(query: string): Promise<ThoughtBranch[]> {
    const totPrompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are the Multi-Path Reasoner.
Generate 3 distinct logical approaches to solve the user's inquiry.
Critique each approach and assign a confidence score (0-100).

RETURN ONLY JSON ARRAY:
[
  { "path": "Description of approach 1", "score": 85, "critique": "Pros/Cons" },
  ...
]
`
        },
        { role: 'user', content: query }
    ];

    try {
        const rawResponse = await completeInference(totPrompt, 0.4);

        // Robust JSON extraction
        const jsonMatch = rawResponse.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.map((item: any) => ({
                path: item.path || "Unknown path",
                score: typeof item.score === 'number' ? item.score : 50,
                critique: item.critique || "No critique"
            })).sort((a: any, b: any) => b.score - a.score);
        }

        console.warn('[ToT] Failed to parse JSON, falling back to empty.');
        return [];

    } catch (error) {
        console.error('[ToT] Error:', error);
        return [];
    }
}
