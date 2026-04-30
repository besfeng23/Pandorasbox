import { searchPoints } from '@/lib/sovereign/qdrant-client';
import { embedText } from '@/lib/ai/embedding';

/**
 * Extracts distinct technical identifiers from a query to use as filters.
 * Matches: Error codes (503, 404), File extensions (.ts, .json), 
 * specific IDs (P2002), or quoted "keywords".
 */
export function extractKeywords(query: string): string[] {
    const keywords: string[] = [];

    // 1. Quoted terms (highest signal)
    const quoted = query.match(/"([^"]+)"/g);
    if (quoted) {
        quoted.forEach(q => keywords.push(q.replace(/"/g, '')));
    }

    // 2. Error codes (3-digit numbers often in queries)
    const statusCodes = query.match(/\b\d{3}\b/g);
    if (statusCodes) {
        statusCodes.forEach(code => {
            // Filter out common small numbers that might not be error codes
            if (['200', '404', '500', '503', '401', '403'].includes(code)) {
                keywords.push(code);
            }
        });
    }

    // 3. File extensions (.ts, .tsx, .js, .json, .py, .md)
    const extensions = query.match(/\b\.[a-z0-9]{2,4}\b/g);
    if (extensions) keywords.push(...extensions);

    // 4. Specific technical IDs (e.g., P2002, UUID fragments)
    const technicalTerms = query.match(/\b[A-Za-z]+\d+[a-zA-Z0-9]*\b/g);
    if (technicalTerms) keywords.push(...technicalTerms);

    // Deduplicate and trim
    return [...new Set(keywords.map(kw => kw.trim()))].filter(kw => kw.length > 0);
}

/**
 * Hybrid search implementation combining vector similarity with keyword boosting.
 */
export async function hybridSearch(query: string, userId: string, agentId: string = 'universe', workspaceId?: string, limit: number = 5) {
    try {
        // 1. Generate embedding
        const queryVector = await embedText(query);

        // 2. Extract keywords for boosting
        const keywords = extractKeywords(query);
        console.log(`[HybridSearch] Keywords extracted from \"${query}\":`, keywords);

        // 3. Build Qdrant filter
        const collectionName = 'memories';

        const filter: any = {
            must: [
                { key: 'userId', match: { value: userId } }
            ]
        };

        if (workspaceId) {
            filter.must.push({ key: 'workspaceId', match: { value: workspaceId } });
        }

        // 4. Keyword Boosting (using 'should' clauses in Qdrant)
        if (keywords.length > 0) {
            filter.should = keywords.map(kw => ({
                key: 'content',
                match: { text: kw } // Requires full-text index on 'content'
            }));
        }

        // 5. Perform search
        const results = await searchPoints(collectionName, queryVector, limit, filter);

        return results;

    } catch (error: any) {
        console.error('[HybridSearch] Error:', error);
        // Fallback to basic search if hybrid fails
        return [];
    }
}
