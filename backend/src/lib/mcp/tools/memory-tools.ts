/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MEMORY SEARCH MCP TOOL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Allows the Builder Agent (Gemini) to search the Universe Agent's memory.
 */

import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';

const QDRANT_URL = process.env.QDRANT_URL || 'http://localhost:6333';
const COLLECTION = process.env.QDRANT_COLLECTION || 'memories';

export const searchUniverseMemorySchema = z.object({
    query: z.string().describe('The search query to find relevant memories'),
    userId: z.string().describe('The ID of the user whose memories to search'),
    limit: z.number().optional().default(5).describe('Maximum number of results (default 5)')
});

export const addUniverseMemorySchema = z.object({
    content: z.string().describe('The factual information to save permanently'),
    userId: z.string().describe('The user ID to associate this memory with'),
    agentId: z.enum(['universe', 'builder']).optional().default('universe').describe('The agent collection (default universe)')
});

/**
 * Explicitly adds a permanent fact to the Universe memory (Qdrant)
 */
export async function add_universe_memory(args: z.infer<typeof addUniverseMemorySchema>) {
    const { content, userId, agentId } = args;
    const collectionName = agentId === 'universe' ? COLLECTION : `memories__${agentId}`;

    try {
        console.log(`[MCP Tool] add_universe_memory: Saving fact for ${userId} to ${collectionName}`);

        // 1. Generate embedding
        const embedding = await generateEmbedding(content);

        // 2. Insert into Qdrant
        const response = await fetch(`${QDRANT_URL}/collections/${collectionName}/points`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                points: [{
                    id: uuidv4(),
                    vector: embedding,
                    payload: {
                        uid: userId, // Aligning with MemoryJanitor's uid field
                        agentId,
                        content,
                        type: 'fact',
                        createdAt: new Date().toISOString()
                    }
                }]
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Qdrant insertion failed: ${response.status} - ${errText}`);
        }

        return {
            success: true,
            summary: `Successfully saved to permanent memory: "${content}"`
        };

    } catch (error: any) {
        console.error('[MCP Tool] add_universe_memory error:', error);
        return { error: error.message };
    }
}

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
                    must: [{ key: 'uid', match: { value: userId } }]
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
