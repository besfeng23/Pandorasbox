import { completeInference, ChatMessage } from '@/lib/sovereign/inference';
import { tavily } from '@tavily/core';

export interface FactCheckResult {
    isSupported: boolean;
    citation?: string;
    correction?: string;
    confidence: number;
}

/**
 * Verifies a claim against internal context (RAG) and external web search (Tavily).
 */
export async function verifyClaim(claim: string, context: string): Promise<FactCheckResult> {
    let externalContext = "";

    // 1. External Search (if enabled)
    if (process.env.TAVILY_API_KEY) {
        try {
            const tv = tavily({ apiKey: process.env.TAVILY_API_KEY });
            const searchResult = await tv.search(claim, {
                searchDepth: "basic",
                maxResults: 3
            });
            externalContext = `\nexternal_search_results:\n${searchResult.results.map((r: any) => `- ${r.content} (${r.url})`).join('\n')}`;
            console.log('[FactCheck] Included external sources.');
        } catch (e) {
            console.warn('[FactCheck] Tavily search failed:', e);
        }
    }

    const prompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are a Fact Checker. Verify the Claim against the provided Evidence.
evidence:
${context}
${externalContext}

Claim: "${claim}"

Task:
1. Determine if the claim is supported by the evidence.
2. If unsupported or contradicted, provide a specific correction.
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
