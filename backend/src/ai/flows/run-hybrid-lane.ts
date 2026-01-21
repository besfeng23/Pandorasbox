'use server';

/**
 * Phase 5: External Knowledge Fusion
 * 
 * Hybrid reasoning lane that combines internal memory search with external
 * web knowledge to provide comprehensive context for AI reasoning.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { hybridSearch, HybridSearchResult } from '@/lib/hybrid-search';

const HybridLaneInputSchema = z.object({
  query: z.string(),
  userId: z.string(),
  limit: z.number().optional().default(10),
});

const HybridLaneOutputSchema = z.object({
  fusedResults: z.array(z.object({
    id: z.string(),
    content: z.string(),
    source: z.enum(['internal', 'external']),
    confidence: z.number(),
    fusedScore: z.number(),
    timestamp: z.string().optional(),
    url: z.string().optional(),
    title: z.string().optional(),
  })),
  internalCount: z.number(),
  externalCount: z.number(),
  fusedContext: z.string(), // Formatted context for AI reasoning
});

/**
 * Runs hybrid reasoning lane that combines internal memories with external knowledge.
 * 
 * This flow:
 * 1. Performs hybrid search (internal + external)
 * 2. Formats results into fused context for AI reasoning
 * 3. Returns both structured results and formatted context string
 */
export async function runHybridLane(
  input: z.infer<typeof HybridLaneInputSchema>
): Promise<z.infer<typeof HybridLaneOutputSchema>> {
  const hybridFlow = ai.defineFlow(
    {
      name: 'runHybridLaneFlow',
      inputSchema: HybridLaneInputSchema,
      outputSchema: HybridLaneOutputSchema,
    },
    async ({ query, userId, limit }) => {
      try {
        // Perform hybrid search
        const results = await hybridSearch(query, userId, limit);

        // Separate internal and external results
        const internalResults = results.filter(r => r.source === 'internal');
        const externalResults = results.filter(r => r.source === 'external');

        // Format results into context for AI reasoning
        const contextParts: string[] = [];

        if (internalResults.length > 0) {
          contextParts.push('--- INTERNAL MEMORIES (From Your Knowledge Base) ---');
          internalResults.forEach((result, index) => {
            const relevance = (result.confidence * 100).toFixed(0);
            contextParts.push(
              `[INTERNAL MEMORY ${index + 1}] (${relevance}% relevance, fused score: ${result.fusedScore.toFixed(3)})\n${result.content}`
            );
          });
          contextParts.push('');
        }

        if (externalResults.length > 0) {
          contextParts.push('--- EXTERNAL KNOWLEDGE (From Web Search) ---');
          externalResults.forEach((result, index) => {
            const relevance = (result.confidence * 100).toFixed(0);
            const title = result.title ? `\nTitle: ${result.title}` : '';
            const url = result.url ? `\nSource: ${result.url}` : '';
            contextParts.push(
              `[EXTERNAL KNOWLEDGE ${index + 1}] (${relevance}% confidence, fused score: ${result.fusedScore.toFixed(3)})${title}${url}\n${result.content}`
            );
          });
          contextParts.push('');
        }

        const fusedContext = contextParts.join('\n\n') || 'No relevant knowledge found.';

        // Convert results to output format (convert Date to string)
        const formattedResults = results.map(result => ({
          id: result.id,
          content: result.content,
          source: result.source,
          confidence: result.confidence,
          fusedScore: result.fusedScore,
          timestamp: result.timestamp?.toISOString(),
          url: result.url,
          title: result.title,
        }));

        console.log(`[runHybridLane] Hybrid search completed: ${internalResults.length} internal, ${externalResults.length} external results`);

        return {
          fusedResults: formattedResults,
          internalCount: internalResults.length,
          externalCount: externalResults.length,
          fusedContext,
        };

      } catch (error: any) {
        console.error(`[runHybridLane] Error in hybrid reasoning:`, error);
        
        // Return empty results on error
        return {
          fusedResults: [],
          internalCount: 0,
          externalCount: 0,
          fusedContext: 'Error retrieving knowledge: ' + error.message,
        };
      }
    }
  );

  return await hybridFlow({ query: input.query, userId: input.userId, limit: input.limit });
}

