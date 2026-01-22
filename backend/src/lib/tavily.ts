
'use server';

import { tavily, type TavilyClient } from '@tavily/core';

let tavilyClient: TavilyClient | null = null;

function getTavilyClient(): TavilyClient {
  if (tavilyClient) return tavilyClient;

  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'TAVILY_API_KEY is not configured. Please set it in your environment variables.'
    );
  }

  tavilyClient = tavily({
    apiKey,
  });

  return tavilyClient;
}

export type TavilySearchResult = {
  query: string;
  results: {
    title: string;
    snippet: string;
    url: string;
  }[];
};

/**
 * Performs a Tavily web search for the given query.
 * Wrapped in a helper so we can centrally control defaults and logging.
 */
export async function tavilySearch(
  query: string,
  options?: {
    maxResults?: number;
    includeAnswer?: boolean;
    includeRawContent?: boolean;
    searchDepth?: 'basic' | 'advanced';
    topic?: 'general' | 'news' | 'finance';
  }
): Promise<TavilySearchResult> {
  const client = getTavilyClient();
  const maxResults = options?.maxResults ?? 5;

  // Tavily API returns an array of results with title, content/snippet, and url
  const response = await client.search({
    query,
    maxResults,
    includeAnswer: options?.includeAnswer ?? false,
    includeRawContent: options?.includeRawContent ?? false,
    searchDepth: options?.searchDepth ?? 'basic',
    topic: options?.topic ?? 'general',
  } as any);

  const results =
    (response.results || []).map((r: any) => ({
      title: r.title || '',
      snippet: r.content || r.snippet || '',
      url: r.url || '',
    })) ?? [];

  return {
    query,
    results,
  };
}
