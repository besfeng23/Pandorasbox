import { describe, it, expect, vi, beforeEach } from 'vitest';
import { routeQuery } from './router';
import * as embeddingModule from './embedding';

// Mock the embedding module
vi.mock('./embedding', () => ({
    embedText: vi.fn(),
}));

describe('Subnetwork Router', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        // Define a SINGLE robust mock that works for all scenarios.
        // This handles "cold start" initialization for all agents at once.
        vi.spyOn(embeddingModule, 'embedText').mockImplementation(async (text: string) => {
            const t = text.toLowerCase();

            // 1. Builder Vector (Technical)
            if (t.includes('code') || t.includes('react') || t.includes('bug') || t.includes('technical') || t.includes('developer')) {
                return [1, 0, 0, 0, 0, 0];
            }

            // 2. Universe Vector (Philosophical)
            if (t.includes('philosophical') || t.includes('meaning') || t.includes('life') || t.includes('creative') || t.includes('universe')) {
                return [0, 1, 0, 0, 0, 0];
            }

            // 3. Analyst Vector (Data)
            if (t.includes('analyze') || t.includes('data') || t.includes('financial')) {
                return [0, 0, 1, 0, 0, 0];
            }

            // Default / Other Agents
            return [0.001, 0.001, 0.001, 0.001, 0.001, 0.001];
        });
    });

    it('should route technical queries to the Builder', async () => {
        // Query: "Write some React code" matches the 'Builder Vector' condition
        // Builder Description: Contains 'code', 'react' -> Matches 'Builder Vector' condition
        // Similarity should be 1.0
        const result = await routeQuery("Write some React code");

        expect(result.agentId).toBe('builder');
        expect(result.confidence).toBeGreaterThan(0.9);
    });

    it('should route philosophical queries to the Universe', async () => {
        // Query: "meaning of life" matches 'Universe Vector' condition
        // Universe Description: Contains 'Philosophical' -> Matches 'Universe Vector' condition
        // Similarity should be 1.0
        const result = await routeQuery("What is the meaning of life?");

        expect(result.agentId).toBe('universe');
        expect(result.confidence).toBeGreaterThan(0.9);
    });
});
