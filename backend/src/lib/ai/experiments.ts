/**
 * Simple A/B Testing for Prompts/Models
 */

export interface Experiment {
    id: string;
    variants: string[];
    weights: number[]; // [0.5, 0.5]
}

const EXPERIMENTS: Record<string, Experiment> = {
    'system-prompt-tone': {
        id: 'system-prompt-tone',
        variants: ['default', 'concise'],
        weights: [0.8, 0.2] // 20% users get concise
    }
};

export function getVariant(experimentId: string, userId: string): string {
    const exp = EXPERIMENTS[experimentId];
    if (!exp) return 'control';

    // Deterministic hashing based on userId
    const hash = simpleHash(userId + experimentId);
    const normalized = hash % 100; // 0-99

    let cumulative = 0;
    for (let i = 0; i < exp.weights.length; i++) {
        cumulative += exp.weights[i] * 100;
        if (normalized < cumulative) {
            return exp.variants[i];
        }
    }
    return exp.variants[0];
}

function simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0;
    }
    return Math.abs(hash);
}
