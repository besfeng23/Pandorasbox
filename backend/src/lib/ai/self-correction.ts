import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface LogicValidation {
    isValid: boolean;
    flaw?: string;
    suggestion?: string;
}

/**
 * Validates the logical coherence of a reasoning chain.
 */
export async function validateLogic(reasoning: string): Promise<LogicValidation> {
    const prompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are a Logic Validator. Analyze the reasoning for fallacies (Circular Reasoning, Non-sequitur, Contradiction).
Reasoning: "${reasoning}"

FORMAT JSON:
{
  "isValid": boolean,
  "flaw": "Name of fallacy or null",
  "suggestion": "How to fix it"
}`
        }
    ];

    try {
        const response = await completeInference(prompt, 0.1);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return { isValid: true };
    } catch {
        return { isValid: true };
    }
}

/**
 * Auto-corrects a drafted response if it contains detected errors.
 */
export async function autoCorrect(draft: string, flaw: string): Promise<string> {
    const prompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are an Editor. Rewrite the draft to fix the following logical flaw: ${flaw}.
Keep the tone and intent, just fix the error.`
        },
        { role: 'user', content: draft }
    ];
    return await completeInference(prompt, 0.2);
}
