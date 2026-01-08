'use server';

/**
 * Phase 5: External Knowledge Fusion
 * 
 * Hybrid search combines internal memory search with external web search (Tavily)
 * to provide comprehensive knowledge retrieval with fused scoring.
 */

import { searchMemories } from './vector';
import { tavilySearch, TavilySearchResult } from './tavily';
import { getCachedResults, cacheExternalResults } from './external-cache';

export interface HybridSearchResult {
  id: string;
  content: string;
  source: 'internal' | 'external';
  confidence: number;
  fusedScore: number;
  timestamp?: Date;
  url?: string; // For external results
  title?: string; // For external results
}

/**
 * Performs hybrid search combining internal memories and external web search.
 * 
 * @param query - Search query text
 * @param userId - User ID for filtering internal memories
 * @param limit - Maximum number of results to return (default: 10)
 * @returns Array of fused search results sorted by fused score (descending)
 */
export async function hybridSearch(
  query: string,
  userId: string,
  limit: number = 10
): Promise<HybridSearchResult[]> {
  if (!query.trim() || !userId) {
    return [];
  }

  try {
    // Check cache for external results first
    const cachedExternal = await getCachedResults(query);
    
    // Parallel search: internal memories + external web (or cached)
    const [internalResults, externalResults] = await Promise.all([
      // Internal memory search
      searchMemories(query, userId, Math.ceil(limit * 0.6)), // Get more internal results
      
      // External web search (use cache if available, otherwise fetch)
      cachedExternal.length > 0
        ? Promise.resolve({
            query,
            results: cachedExternal.map(item => ({
              title: item.title || '',
              snippet: item.content,
              url: item.url || '',
            })),
          } as TavilySearchResult)
        : tavilySearch(query, { maxResults: Math.ceil(limit * 0.4) }),
    ]);

    // If we fetched fresh external results, cache them
    if (cachedExternal.length === 0 && externalResults.results.length > 0) {
      await cacheExternalResults(query, externalResults.results);
    }

    // Convert internal results to HybridSearchResult format
    const internalHybrid: HybridSearchResult[] = internalResults.map(result => ({
      id: result.id,
      content: result.text,
      source: 'internal' as const,
      confidence: result.score, // Internal confidence is the similarity score
      fusedScore: result.score * 0.6, // Internal weight: 60%
      timestamp: result.timestamp,
    }));

    // Convert external results to HybridSearchResult format
    const externalHybrid: HybridSearchResult[] = externalResults.results.map((result, index) => {
      // Calculate confidence based on position (first results are more confident)
      // Normalize to 0-1 range with decay for later results
      const positionConfidence = 1.0 - (index * 0.1); // Decrease by 10% per position
      const confidence = Math.max(0.3, positionConfidence); // Minimum 0.3 confidence

      return {
        id: `external_${query}_${index}`, // Generate unique ID for external results
        content: result.snippet || result.title || '',
        source: 'external' as const,
        confidence,
        fusedScore: confidence * 0.4, // External weight: 40%
        url: result.url,
        title: result.title,
      };
    });

    // Combine and sort by fused score (descending)
    const allResults = [...internalHybrid, ...externalHybrid]
      .sort((a, b) => b.fusedScore - a.fusedScore)
      .slice(0, limit);

    console.log(`[hybridSearch] Found ${internalHybrid.length} internal and ${externalHybrid.length} external results. Returning top ${allResults.length} fused results.`);

    return allResults;

  } catch (error: any) {
    console.error(`[hybridSearch] Error performing hybrid search for user ${userId}:`, error);
    
    // Fallback to internal search only if external fails
    try {
      const fallbackResults = await searchMemories(query, userId, limit);
      return fallbackResults.map(result => ({
        id: result.id,
        content: result.text,
        source: 'internal' as const,
        confidence: result.score,
        fusedScore: result.score * 0.6, // Only internal score
        timestamp: result.timestamp,
      }));
    } catch (fallbackError) {
      console.error(`[hybridSearch] Fallback internal search also failed:`, fallbackError);
      return [];
    }
  }
}

