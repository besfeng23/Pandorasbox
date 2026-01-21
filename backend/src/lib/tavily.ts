<<<<<<< HEAD:backend/src/lib/tavily.ts
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
=======
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
>>>>>>> bbd6b23ef01342a97a6705259cda62785d79f2ab:src/lib/tavily.ts
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
<<<<<<< HEAD:backend/src/lib/tavily.ts
  options: TavilySearchOptions = {}
): Promise<TavilySearchResult> {
  const client = getTavilyClient();
  const maxResults = options.maxResults ?? 5;
=======
  options?: {
    maxResults?: number;
  }
): Promise<TavilySearchResult> {
  const client = getTavilyClient();
  if (!client) {
    throw new Error('Tavily client not initialized');
  }
  const maxResults = options?.maxResults ?? 5;
>>>>>>> bbd6b23ef01342a97a6705259cda62785d79f2ab:src/lib/tavily.ts

  // Tavily API returns an array of results with title, content/snippet, and url
  const response = await client.search({
    query,
    maxResults,
<<<<<<< HEAD:backend/src/lib/tavily.ts
    includeAnswer: options.includeAnswer ?? false,
    includeRawContent: options.includeRawContent ?? false,
    searchDepth: options.searchDepth ?? 'basic',
    topic: options.topic ?? 'general',
=======
>>>>>>> bbd6b23ef01342a97a6705259cda62785d79f2ab:src/lib/tavily.ts
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

<<<<<<< HEAD:backend/src/lib/tavily.ts
=======

>>>>>>> bbd6b23ef01342a97a6705259cda62785d79f2ab:src/lib/tavily.ts
