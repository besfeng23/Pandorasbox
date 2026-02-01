/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MEMORY SEARCH MCP TOOL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Allows the Builder Agent (Gemini) to search the Universe Agent's memory.
 */

import { z } from 'zod';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION = process.env.QDRANT_COLLECTION || 'memories';

export const searchUniverseMemorySchema = z.object({
    query: z.string().describe('The search query to find relevant memories'),
    userId: z.string().describe('The ID of the user whose memories to search'),
    limit: z.number().optional().default(5).describe('Maximum number of results (default 5)')
});

/**
 * Searches Qdrant for semantic matches in the memories collection
 */
export async function search_universe_memory(args: z.infer<typeof searchUniverseMemorySchema>) {
    const { query, userId, limit } = args;

    try {
        // 1. Generate embedding for the search query
        const embedding = await generateEmbedding(query);

        // 2. Search Qdrant
        const response = await fetch(`${QDRANT_URL}/collections/${COLLECTION}/points/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vector: embedding,
                filter: {
                    must: [{ key: 'userId', match: { value: userId } }]
                },
                limit,
                with_payload: true,
                score_threshold: 0.7
            })
        });

        if (!response.ok) throw new Error(`Qdrant search failed: ${response.status}`);

        const data = await response.json();
        const results = (data.result || []).map((p: any) => ({
            content: p.payload?.content,
            type: p.payload?.type,
            score: p.score
        }));

        return {
            results,
            summary: `Found ${results.length} relevant memories for query: "${query}"`
        };

    } catch (error: any) {
        console.error('[MCP Tool] search_universe_memory error:', error);
        return { error: error.message };
    }
}

async function generateEmbedding(text: string): Promise<number[]> {
    const embeddingsUrl = process.env.EMBEDDINGS_BASE_URL || 'http://localhost:8080';
    const response = await fetch(`${embeddingsUrl}/embed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
    });
    if (!response.ok) throw new Error(`Embedding failed: ${response.status}`);
    const data = await response.json();
    return data.embedding || data.vector || [];
}
