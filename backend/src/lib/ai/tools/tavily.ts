import { tavily } from '@tavily/core';
import { tool } from 'ai';
import { z } from 'zod';

const tvly = process.env.TAVILY_API_KEY ? tavily({ apiKey: process.env.TAVILY_API_KEY }) : null;

export const searchWeb = tool({
    description: 'Search the web for up-to-date information, news, and real-time data.',
    inputSchema: z.object({
        query: z.string().describe('The search query to perform.'),
        max_results: z.number().optional().describe('Maximum number of results to return (default: 5)'),
        include_domains: z.array(z.string()).optional().describe('List of domains to include in search'),
        exclude_domains: z.array(z.string()).optional().describe('List of domains to exclude from search')
    }),
    execute: async ({ query, max_results = 5, include_domains, exclude_domains }: { query: string, max_results?: number, include_domains?: string[], exclude_domains?: string[] }) => {
        if (!tvly) {
            console.warn('TAVILY_API_KEY not found. Returning mock results.');
            return `[Mock Result] Search functionality required TAVILY_API_KEY. Query was: "${query}"`;
        }

        try {
            const response = await tvly.search(query, {
                limit: max_results,
                includeDomains: include_domains,
                excludeDomains: exclude_domains,
                includeAnswer: true,
            });

            // Format results for the LLM and the specialized UI
            return response.results.map(r => ({
                title: r.title,
                source: r.url,
                snippet: r.content.slice(0, 500)
            }));

        } catch (error) {
            console.error('Tavily search failed:', error);
            return `Error performing web search: ${error instanceof Error ? error.message : String(error)}`;
        }
    },
});
