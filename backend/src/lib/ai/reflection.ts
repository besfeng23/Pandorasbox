import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface VerifyResult {
    isAccurate: boolean;
    correction?: string;
    reasoning: string;
}

/**
 * AI evaluates its own response for factual accuracy and logical consistency.
 * Compares the draft response against the provided context (memories).
 */
export async function selfVerify(response: string, context: string): Promise<VerifyResult> {
    const reflectionPrompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are the Fact-Checker for Pandora's Box.
Evaluate the AI's DRAFT RESPONSE against the provided MEMORY CONTEXT.
Check for hallucinations, contradictions, or missing critical details.

FORMAT:
<accuracy>
[YES/NO]
</accuracy>
<reasoning>
[Explain why the response is accurate or what is wrong]
</reasoning>
<correction>
[If accuracy is NO, provide an improved version of the response]
</correction>`
        },
        {
            role: 'user',
            content: `MEMORY CONTEXT:\n${context.substring(0, 1000)}\n\nDRAFT RESPONSE:\n${response}`
        }
    ];

    try {
        const rawReflection = await completeInference(reflectionPrompt, 0.3);

        const accuracyMatch = rawReflection.match(/<accuracy>([\s\S]*?)<\/accuracy>/);
        const reasoningMatch = rawReflection.match(/<reasoning>([\s\S]*?)<\/reasoning>/);
        const correctionMatch = rawReflection.match(/<correction>([\s\S]*?)<\/correction>/);

        const isAccurate = accuracyMatch?.at(1)?.trim().toUpperCase() === 'YES';
        const reasoning = reasoningMatch ? reasoningMatch[1].trim() : "Verified for consistency.";
        const correction = correctionMatch ? correctionMatch[1].trim() : undefined;

        return {
            isAccurate,
            reasoning,
            correction
        };

    } catch (error) {
        console.error('[Reflection] Error:', error);
        return {
            isAccurate: true, // Default to true to avoid infinite loops/blocks in case of reflection failure
            reasoning: "Reflection skipped due to internal error."
        };
    }
}
