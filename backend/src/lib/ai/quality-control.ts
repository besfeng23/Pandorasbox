
export enum QualityMode {
    FAST,       // Optimizes for speed (latency < 1s)
    BALANCED,   // Standard RAG
    DEEP,       // Full Fact-Check + Self-Correction
    RESEARCH    // ReAct + Tree of Thoughts
}

export interface QualityConfig {
    temperature: number;
    maxTokens: number;
    enableFactCheck: boolean;
    enableSelfCorrection: boolean;
    enableChainOfThought: boolean;
    modelModel: 'gpt-4o' | 'gpt-4o-mini'; // Approximation
}

/**
 * Determines optimal inference parameters based on urgency and complexity.
 */
export function getQualityConfig(mode: QualityMode): QualityConfig {
    switch (mode) {
        case QualityMode.FAST:
            return {
                temperature: 0.3,
                maxTokens: 500,
                enableFactCheck: false,
                enableSelfCorrection: false,
                enableChainOfThought: false,
                modelModel: 'gpt-4o-mini'
            };
        case QualityMode.BALANCED:
            return {
                temperature: 0.7,
                maxTokens: 2000,
                enableFactCheck: false, // Only on demand or suspicion
                enableSelfCorrection: false,
                enableChainOfThought: false,
                modelModel: 'gpt-4o'
            };
        case QualityMode.DEEP:
            return {
                temperature: 0.5,
                maxTokens: 4000,
                enableFactCheck: true,
                enableSelfCorrection: true,
                enableChainOfThought: true,
                modelModel: 'gpt-4o'
            };
        case QualityMode.RESEARCH:
        default:
            return {
                temperature: 0.6,
                maxTokens: 8000,
                enableFactCheck: true,
                enableSelfCorrection: true,
                enableChainOfThought: true,
                modelModel: 'gpt-4o'
            };
    }
}

/**
 * Simple heuristic to guess complexity if not specified.
 */
export function inferQualityMode(query: string): QualityMode {
    const q = query.toLowerCase();

    // Research indicators
    if (q.includes('research') || q.includes('investigate') || q.includes('analysis of')) {
        return QualityMode.RESEARCH;
    }

    // Deep thought indicators
    if (q.includes('verify') || q.includes('check') || q.includes('critique') || q.includes('proof')) {
        return QualityMode.DEEP;
    }

    // Speed indicators
    if (q.includes('quick') || q.length < 20) {
        return QualityMode.FAST;
    }

    return QualityMode.BALANCED;
}
