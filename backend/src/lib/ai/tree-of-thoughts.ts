import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface ThoughtBranch {
    path: string;
    score: number;
    critique: string;
}

/**
 * Explores multiple reasoning paths in parallel to find the most robust solution.
 * Excellent for debugging, mathematical proofs, or complex architectural decisions.
 */
export async function exploreTreeOfThoughts(query: string): Promise<ThoughtBranch[]> {
    const totPrompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are the Multi-Path Reasoner for Pandora's Box.
Generate 3 distinct logical paths to solve the user's problem.
For each path, provide a brief critique and a success score (0-100).

FORMAT:
PATH 1: [Logic] | SCORE: [N] | CRITIQUE: [Why this might fail]
PATH 2: ...
PATH 3: ...`
        },
        { role: 'user', content: query }
    ];

    try {
        const rawResponse = await completeInference(totPrompt, 0.6);
        const lines = rawResponse.split('\n').filter(l => l.startsWith('PATH'));

        return lines.map(line => {
            const path = line.match(/PATH \d: (.*?) \|/)?.[1] || "";
            const score = parseInt(line.match(/SCORE: (\d+)/)?.[1] || "0");
            const critique = line.match(/CRITIQUE: (.*)/)?.[1] || "";
            return { path, score, critique };
        });

    } catch (error) {
        console.error('[ToT] Error:', error);
        return [];
    }
}
