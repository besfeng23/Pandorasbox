/**
 * Uncertainty Quantification Engine
 * Note: Since we don't access raw logprobs from all providers, we simulate confidence
 * based on linguistic markers (hedging words) or explicit self-assessment.
 */

import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface UncertaintyAssessment {
    score: number; // 0-100
    isAmbiguous: boolean;
    notes: string;
}

export async function calculateConfidence(text: string): Promise<UncertaintyAssessment> {
    const prompt: ChatMessage[] = [
        {
            role: 'system',
            content: `Analyze the text for uncertainty markers (e.g., "might", "probably", "unsure", "it seems").
Return a confidence score (0-100).
FORMAT JSON:
{ "score": number, "isAmbiguous": boolean, "notes": "reason" }`
        },
        { role: 'user', content: text }
    ];

    try {
        const response = await completeInference(prompt, 0.1);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) return JSON.parse(jsonMatch[0]);
        return { score: 100, isAmbiguous: false, notes: 'Default' };
    } catch {
        return { score: 100, isAmbiguous: false, notes: 'Error' };
    }
}

export function flagAmbiguity(prompt: string): boolean {
    const vagueWords = ['thing', 'stuff', 'it', 'they', 'do that'];
    const words = prompt.toLowerCase().split(' ');
    // Simple heuristic: if > 30% of words are vague
    let matchCount = 0;
    words.forEach(w => { if (vagueWords.includes(w)) matchCount++; });
    return (matchCount / words.length) > 0.3;
}
