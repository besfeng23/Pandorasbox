export interface ModelRoute {
    provider: 'openai' | 'groq' | 'ollama' | 'anthropic' | 'google';
    modelId: string;
    reasoningRequired: boolean;
}

/**
 * Dynamically selects the best AI model for a given request.
 * Optimizes for cost, speed, and reasoning depth.
 */
export async function selectModel(
    message: string,
    intent: 'CHAT' | 'BUILD' | 'ANALYZE' | 'SUMMARIZE',
    estimatedTokens: number = 0
): Promise<ModelRoute> {
    // 1. Logic: BUILD or high complexity requires powerful models (llama-3-70b/gpt-4o)
    const isComplex = message.length > 500 || intent === 'BUILD' || estimatedTokens > 1000;

    // 2. Logic: SUMMARIZE can use cheaper, faster models
    if (intent === 'SUMMARIZE' && !isComplex) {
        return {
            provider: 'groq',
            modelId: 'llama-3.1-8b-instant',
            reasoningRequired: false
        };
    }

    // 3. Logic: Default to specialized agents
    if (intent === 'BUILD') {
        return {
            provider: 'groq',
            modelId: process.env.BUILDER_MODEL || 'llama-3.3-70b-versatile',
            reasoningRequired: true
        };
    }

    // 4. Default Sovereign Route (Universe)
    return {
        provider: 'ollama',
        modelId: process.env.UNIVERSE_MODEL || 'llama3:70b-instruct-q4_0',
        reasoningRequired: isComplex
    };
}
