import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface ReasoningResult {
    thinking: string;
    decomposition: string[];
    confidence: number;
}

/**
 * Generates a Chain-of-Thought reasoning block before the final answer.
 * Uses a two-pass approach:
 * 1. Decompose and reason about the problem.
 * 2. Return the structured thought process.
 */
export async function generateReasoning(messages: ChatMessage[]): Promise<ReasoningResult> {
    const lastUserMessage = messages[messages.length - 1]?.content || '';

    const reasoningPrompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are the Reasoning Core of a Sovereign AI. 
Analyze the user's request and break it down into logical steps.
Identify potential pitfalls, required knowledge, and the most efficient path to a solution.

FORMAT:
<thinking>
[Detailed internal monologue about the problem]
</thinking>
<steps>
- Step 1
- Step 2
</steps>
<confidence>
[Score 0.0-1.0]
</confidence>`
        },
        ...messages.slice(-3), // Provide recent context
        {
            role: 'user',
            content: `Reason about this request: "${lastUserMessage}"`
        }
    ];

    try {
        const rawReasoning = await completeInference(reasoningPrompt, 0.4);

        // Extract components using Regex
        const thinkingMatch = rawReasoning.match(/<thinking>([\s\S]*?)<\/thinking>/);
        const stepsMatch = rawReasoning.match(/<steps>([\s\S]*?)<\/steps>/);
        const confidenceMatch = rawReasoning.match(/<confidence>([\s\S]*?)<\/confidence>/);

        const thinking = thinkingMatch ? thinkingMatch[1].trim() : "Unable to generate detailed reasoning.";
        const steps = stepsMatch
            ? stepsMatch[1].trim().split('\n').map(s => s.replace(/^- /, '').trim())
            : ["General processing"];
        const confidence = confidenceMatch ? parseFloat(confidenceMatch[1].trim()) || 0.8 : 0.8;

        return {
            thinking,
            decomposition: steps,
            confidence
        };

    } catch (error) {
        // Fallback for refusals or errors (e.g. toxicity)
        return {
            thinking: "Input processing skipped complex reasoning (Safety/Speed Fallback).",
            decomposition: ["Direct Response Generation"],
            confidence: 1.0 // High confidence in the safety fallback
        };
    }
}
