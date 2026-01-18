import 'server-only';
import { tavily } from '@tavily/core';

type TavilySearchOptions = {
  maxResults?: number;
  includeAnswer?: boolean;
  includeRawContent?: boolean;
  searchDepth?: 'basic' | 'advanced';
  topic?: 'general' | 'news' | 'finance';
};

function getTavilyClient() {
  const apiKey = process.env.TAVILY_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('Missing TAVILY_API_KEY in environment.');
  }

  return tavily({ apiKey });
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
  options: TavilySearchOptions = {}
): Promise<TavilySearchResult> {
  const client = getTavilyClient();
  const maxResults = options.maxResults ?? 5;

  // Tavily API returns an array of results with title, content/snippet, and url
  const response = await client.search({
    query,
    maxResults,
    includeAnswer: options.includeAnswer ?? false,
    includeRawContent: options.includeRawContent ?? false,
    searchDepth: options.searchDepth ?? 'basic',
    topic: options.topic ?? 'general',
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

