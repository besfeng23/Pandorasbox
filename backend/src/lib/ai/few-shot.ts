import { hybridSearch } from '@/lib/hybrid/search';

export interface ShotExample {
    input: string;
    output: string;
}

/**
 * Retrieves relevant few-shot examples from the memory vault.
 * Helps the AI recognize patterns in user formatting or style.
 */
export async function getFewShotPrompt(query: string, userId: string): Promise<string> {
    try {
        // Search for highly similar past interactions that were marked as successful
        const similarMemories = await hybridSearch(query, userId, 'universe', undefined, 3);

        if (similarMemories.length === 0) return "";

        const examples = similarMemories
            .filter(m => m.payload?.type === 'fact' || m.payload?.type === 'crystallized')
            .map(m => `EXAMPLE_INPUT: ${query.substring(0, 50)}\nEXAMPLE_FACT: ${m.payload?.content}`)
            .join('\n\n');

        if (!examples) return "";

        return `### RELEVANT EXAMPLES:\n${examples}\n\nUse the style and patterns from these examples if applicable.`;

    } catch (error) {
        console.error('[FewShot] Error:', error);
        return "";
    }
}
