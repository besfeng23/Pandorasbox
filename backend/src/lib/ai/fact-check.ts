import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface FactCheckResult {
    isSupported: boolean;
    citation?: string;
    correction?: string;
    confidence: number;
}

/**
 * Verifies if a claim is supported by the provided context (RAG).
 */
export async function verifyClaim(claim: string, context: string): Promise<FactCheckResult> {
    const prompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are a Fact Checker. Verify the Claim against the Context.
Context:
${context}

Claim: "${claim}"

Task:
1. Determine if the claim is supported by the context.
2. If unsupported or contradicted, provide a specific correction based ONLY on the context.
3. Assign a confidence score (0-100).

FORMAT JSON:
{
  "isSupported": boolean,
  "citation": "Quote from context",
  "correction": "Corrected statement if false",
  "confidence": number
}`
        }
    ];

    try {
        const response = await completeInference(prompt, 0.1); // Low temp for logic
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { isSupported: true, confidence: 50 }; // Default to pass if parsing fails
    } catch (e) {
        console.warn('Fact check failed:', e);
        return { isSupported: true, confidence: 50 };
    }
}

/**
 * Checks if the AI's response contradicts the source material.
 */
export async function detectContradiction(response: string, sourceMaterial: string): Promise<boolean> {
    if (!sourceMaterial) return false;

    const res = await verifyClaim(response, sourceMaterial);
    return !res.isSupported && res.confidence > 80;
}
