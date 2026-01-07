'use server';

// @ts-ignore - TavilyClient type definitions might not export the class correctly
import { TavilyClient } from '@tavily/core';

let tavilyClient: any = null;

function getTavilyClient() {
  if (tavilyClient) return tavilyClient;

  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      'TAVILY_API_KEY is not configured. Please set it in your environment variables.'
    );
  }

  // @ts-ignore - TavilyClient is a class but types might not be exported correctly
  tavilyClient = new TavilyClient({
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
  }
): Promise<TavilySearchResult> {
  const client = getTavilyClient();
  if (!client) {
    throw new Error('Tavily client not initialized');
  }
  const maxResults = options?.maxResults ?? 5;

  // Tavily API returns an array of results with title, content/snippet, and url
  const response = await client.search({
    query,
    maxResults,
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


