import { embedText } from './embedding';

interface AgentRoute {
    id: string;
    name: string;
    description: string;
    prototype_embedding?: number[];
}

const AGENTS: AgentRoute[] = [
    {
        id: 'builder',
        name: 'The Builder',
        description: 'Writes code, fixes bugs, explains technical concepts, architectures systems, uses React, Python, TypeScript.',
    },
    {
        id: 'architect',
        name: 'The Architect',
        description: 'High-level system design, folder structure, design patterns, scalability, database schema design, microservices.',
    },
    {
        id: 'reviewer',
        name: 'The Reviewer',
        description: 'Code review, finding logical errors, optimizing performance, refactoring advice, clean code principles.',
    },
    {
        id: 'security',
        name: 'The Guardian',
        description: 'Security auditing, vulnerability assessment, penetration testing, auth flows, encryption, data privacy.',
    },
    {
        id: 'universe',
        name: 'The Universe',
        description: 'Philosophical, creative, writing stories, poems, exploring ideas, ethical dilemmas, abstract concepts.',
    },
    {
        id: 'analyst',
        name: 'The Analyst',
        description: 'Analyzes data, compares options, lists pros and cons, evaluates logic, financial planning, research.',
    }
];

let isInitialized = false;

async function initializeRouter() {
    if (isInitialized) return;

    // Generate prototype embeddings on cold start
    // In a real prod environment, these would be cached/hardcoded
    try {
        for (const agent of AGENTS) {
            agent.prototype_embedding = await embedText(agent.description);
        }
        isInitialized = true;
        console.log('[Router] Semantic Routing Initialized');
    } catch (e) {
        console.warn('[Router] Failed to initialize semantic embeddings, falling back to regex.', e);
    }
}

function cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < a.length; i++) {
        dotProduct += a[i] * b[i];
        normA += a[i] * a[i];
        normB += b[i] * b[i];
    }
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function routeQuery(query: string): Promise<{ agentId: string; confidence: number; reasoning: string }> {
    // 1. Initialize if needed
    if (!isInitialized) await initializeRouter();

    // 2. Fallback if embeddings failed
    if (!isInitialized) {
        if (/(code|function|react|typescript|bug|error|api|component|hook|database|query|deploy)/i.test(query)) {
            return { agentId: 'builder', confidence: 0.9, reasoning: 'Keyword match: Technical terms' };
        }
        return { agentId: 'universe', confidence: 0.5, reasoning: 'Default fallback' };
    }

    try {
        const queryVector = await embedText(query);

        let bestMatch = AGENTS[0];
        let maxScore = -1;

        for (const agent of AGENTS) {
            if (agent.prototype_embedding) {
                const score = cosineSimilarity(queryVector, agent.prototype_embedding);
                if (score > maxScore) {
                    maxScore = score;
                    bestMatch = agent;
                }
            }
        }

        return {
            agentId: bestMatch.id,
            confidence: maxScore,
            reasoning: `Semantic similarity match (${maxScore.toFixed(2)}) with: ${bestMatch.description.slice(0, 30)}...`
        };

    } catch (error) {
        console.error('[Router] Routing failed', error);
        return { agentId: 'universe', confidence: 0.0, reasoning: 'Routing error fallback' };
    }
}
