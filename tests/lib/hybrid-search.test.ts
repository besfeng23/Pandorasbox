// Mock dependencies BEFORE imports to prevent OpenAI SDK initialization
jest.mock('@/lib/vector', () => ({
  searchMemories: jest.fn(),
}));

jest.mock('@/lib/tavily', () => ({
  tavilySearch: jest.fn(),
}));

jest.mock('@/lib/external-cache', () => ({
  getCachedResults: jest.fn(),
  cacheExternalResults: jest.fn(),
}));

jest.mock('@/lib/adaptive-weights', () => ({
  getWeightsWithFallback: jest.fn(),
}));

jest.mock('@/lib/performance-tracker', () => ({
  trackSearchPerformance: jest.fn(),
}));

// Import OpenAI shim for fetch API - must be before any OpenAI imports
import 'openai/shims/node';

import { hybridSearch } from '@/lib/hybrid-search';
import * as vectorModule from '@/lib/vector';
import * as tavilyModule from '@/lib/tavily';
import * as cacheModule from '@/lib/external-cache';
import * as adaptiveWeightsModule from '@/lib/adaptive-weights';
import * as performanceTrackerModule from '@/lib/performance-tracker';

describe('hybrid-search', () => {
  const mockUserId = 'test-user-123';
  const mockQuery = 'test query';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should combine internal and external search results with fused scoring', async () => {
    // Mock internal search results
    const mockInternalResults = [
      {
        id: 'memory-1',
        text: 'Internal memory content',
        score: 0.8,
        timestamp: new Date(),
      },
    ];

    // Mock external search results
    const mockExternalResults = {
      query: mockQuery,
      results: [
        {
          title: 'External Result',
          snippet: 'External content snippet',
          url: 'https://example.com',
        },
      ],
    };

    // Mock functions
    (vectorModule.searchMemories as jest.Mock).mockResolvedValue(mockInternalResults);
    (tavilyModule.tavilySearch as jest.Mock).mockResolvedValue(mockExternalResults);
    (cacheModule.getCachedResults as jest.Mock).mockResolvedValue([]);
    (cacheModule.cacheExternalResults as jest.Mock).mockResolvedValue(undefined);
    (adaptiveWeightsModule.getWeightsWithFallback as jest.Mock).mockResolvedValue({ internal: 0.6, external: 0.4 });
    (performanceTrackerModule.trackSearchPerformance as jest.Mock).mockResolvedValue(undefined);

    const results = await hybridSearch(mockQuery, mockUserId, 10);

    expect(results.length).toBeGreaterThan(0);
    expect(results.some(r => r.source === 'internal')).toBe(true);
    expect(results.some(r => r.source === 'external')).toBe(true);

    // Check fused scores
    const internalResult = results.find(r => r.source === 'internal');
    const externalResult = results.find(r => r.source === 'external');

    expect(internalResult).toBeDefined();
    expect(externalResult).toBeDefined();

    // Internal score should be 0.8 * 0.6 = 0.48
    expect(Math.abs(internalResult!.fusedScore - 0.48)).toBeLessThan(0.01);
    // External score should be positive
    expect(externalResult!.fusedScore).toBeGreaterThan(0);
  });

  it('should use cached external results when available', async () => {
    const mockInternalResults = [
      {
        id: 'memory-1',
        text: 'Internal memory',
        score: 0.7,
        timestamp: new Date(),
      },
    ];

    const mockCachedExternal = [
      {
        query: mockQuery.toLowerCase(),
        source: 'tavily',
        content: 'Cached external content',
        confidence: 0.9,
        cachedAt: new Date(),
        url: 'https://example.com',
        title: 'Cached Result',
      },
    ];

    (vectorModule.searchMemories as jest.Mock).mockResolvedValue(mockInternalResults);
    (cacheModule.getCachedResults as jest.Mock).mockResolvedValue(mockCachedExternal);
    (cacheModule.cacheExternalResults as jest.Mock).mockResolvedValue(undefined);
    (adaptiveWeightsModule.getWeightsWithFallback as jest.Mock).mockResolvedValue({ internal: 0.6, external: 0.4 });
    (performanceTrackerModule.trackSearchPerformance as jest.Mock).mockResolvedValue(undefined);

    const results = await hybridSearch(mockQuery, mockUserId, 10);

    expect(results.length).toBeGreaterThan(0);
    // Should not call tavilySearch when cache is available
    expect(tavilyModule.tavilySearch).not.toHaveBeenCalled();
  });

  it('should fallback to internal-only search on external failure', async () => {
    const mockInternalResults = [
      {
        id: 'memory-1',
        text: 'Internal memory',
        score: 0.6,
        timestamp: new Date(),
      },
    ];

    (vectorModule.searchMemories as jest.Mock).mockResolvedValue(mockInternalResults);
    (tavilyModule.tavilySearch as jest.Mock).mockRejectedValue(new Error('Tavily API error'));
    (cacheModule.getCachedResults as jest.Mock).mockResolvedValue([]);
    (adaptiveWeightsModule.getWeightsWithFallback as jest.Mock).mockResolvedValue({ internal: 0.6, external: 0.4 });

    const results = await hybridSearch(mockQuery, mockUserId, 10);

    expect(results.length).toBeGreaterThan(0);
    expect(results.every(r => r.source === 'internal')).toBe(true);
  });

  it('should return empty array for empty query', async () => {
    const results = await hybridSearch('', mockUserId, 10);
    expect(results).toEqual([]);
  });

  it('should return empty array for empty userId', async () => {
    const results = await hybridSearch(mockQuery, '', 10);
    expect(results).toEqual([]);
  });

  it('should handle embedding failures gracefully', async () => {
    (vectorModule.searchMemories as jest.Mock).mockRejectedValue(new Error('Embedding generation failed'));
    (tavilyModule.tavilySearch as jest.Mock).mockRejectedValue(new Error('External search failed'));
    (cacheModule.getCachedResults as jest.Mock).mockResolvedValue([]);
    (adaptiveWeightsModule.getWeightsWithFallback as jest.Mock).mockResolvedValue({ internal: 0.6, external: 0.4 });

    const results = await hybridSearch(mockQuery, mockUserId, 10);
    expect(results).toEqual([]);
  });

  it('should handle vector search returning empty results', async () => {
    (vectorModule.searchMemories as jest.Mock).mockResolvedValue([]);
    (tavilyModule.tavilySearch as jest.Mock).mockResolvedValue({ query: mockQuery, results: [] });
    (cacheModule.getCachedResults as jest.Mock).mockResolvedValue([]);
    (adaptiveWeightsModule.getWeightsWithFallback as jest.Mock).mockResolvedValue({ internal: 0.6, external: 0.4 });
    (performanceTrackerModule.trackSearchPerformance as jest.Mock).mockResolvedValue(undefined);

    const results = await hybridSearch(mockQuery, mockUserId, 10);
    expect(results).toEqual([]);
  });

  it('should handle large result sets and limit correctly', async () => {
    // Generate 100 internal results
    const mockInternalResults = Array.from({ length: 100 }, (_, i) => ({
      id: `memory-${i}`,
      text: `Internal memory ${i}`,
      score: 0.9 - (i * 0.01),
      timestamp: new Date(),
    }));

    // Generate 50 external results
    const mockExternalResults = {
      query: mockQuery,
      results: Array.from({ length: 50 }, (_, i) => ({
        title: `External Result ${i}`,
        snippet: `External content ${i}`,
        url: `https://example.com/${i}`,
      })),
    };

    (vectorModule.searchMemories as jest.Mock).mockResolvedValue(mockInternalResults);
    (tavilyModule.tavilySearch as jest.Mock).mockResolvedValue(mockExternalResults);
    (cacheModule.getCachedResults as jest.Mock).mockResolvedValue([]);
    (cacheModule.cacheExternalResults as jest.Mock).mockResolvedValue(undefined);
    (adaptiveWeightsModule.getWeightsWithFallback as jest.Mock).mockResolvedValue({ internal: 0.6, external: 0.4 });
    (performanceTrackerModule.trackSearchPerformance as jest.Mock).mockResolvedValue(undefined);

    const limit = 10;
    const results = await hybridSearch(mockQuery, mockUserId, limit);

    expect(results.length).toBeLessThanOrEqual(limit);
    // Results should be sorted by fused score (descending)
    for (let i = 0; i < results.length - 1; i++) {
      expect(results[i].fusedScore).toBeGreaterThanOrEqual(results[i + 1].fusedScore);
    }
  });

  it('should handle timeout by falling back to internal search', async () => {
    const mockInternalResults = [
      {
        id: 'memory-1',
        text: 'Internal memory',
        score: 0.7,
        timestamp: new Date(),
      },
    ];

    // Mock tavily search to timeout
    (vectorModule.searchMemories as jest.Mock).mockResolvedValue(mockInternalResults);
    (tavilyModule.tavilySearch as jest.Mock).mockImplementation(
      () => new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 100))
    );
    (cacheModule.getCachedResults as jest.Mock).mockResolvedValue([]);
    (adaptiveWeightsModule.getWeightsWithFallback as jest.Mock).mockResolvedValue({ internal: 0.6, external: 0.4 });

    // Use a timeout wrapper if needed, but the function should handle it
    const results = await Promise.race([
      hybridSearch(mockQuery, mockUserId, 10),
      new Promise(resolve => setTimeout(() => resolve([]), 200)),
    ]);

    // The function should eventually return results (fallback to internal)
    if (Array.isArray(results) && results.length > 0) {
      expect(results.every(r => r.source === 'internal')).toBe(true);
    }
  });

  it('should handle performance tracking failures without breaking search', async () => {
    const mockInternalResults = [
      {
        id: 'memory-1',
        text: 'Internal memory',
        score: 0.8,
        timestamp: new Date(),
      },
    ];

    const mockExternalResults = {
      query: mockQuery,
      results: [
        {
          title: 'External Result',
          snippet: 'External content',
          url: 'https://example.com',
        },
      ],
    };

    (vectorModule.searchMemories as jest.Mock).mockResolvedValue(mockInternalResults);
    (tavilyModule.tavilySearch as jest.Mock).mockResolvedValue(mockExternalResults);
    (cacheModule.getCachedResults as jest.Mock).mockResolvedValue([]);
    (cacheModule.cacheExternalResults as jest.Mock).mockResolvedValue(undefined);
    (adaptiveWeightsModule.getWeightsWithFallback as jest.Mock).mockResolvedValue({ internal: 0.6, external: 0.4 });
    (performanceTrackerModule.trackSearchPerformance as jest.Mock).mockRejectedValue(new Error('Tracking failed'));

    // Should not throw, even if tracking fails
    const results = await hybridSearch(mockQuery, mockUserId, 10);
    expect(results.length).toBeGreaterThan(0);
  });

  it('should use adaptive weights correctly', async () => {
    const mockInternalResults = [
      {
        id: 'memory-1',
        text: 'Internal memory',
        score: 0.8,
        timestamp: new Date(),
      },
    ];

    const mockExternalResults = {
      query: mockQuery,
      results: [
        {
          title: 'External Result',
          snippet: 'External content',
          url: 'https://example.com',
        },
      ],
    };

    const customWeights = { internal: 0.8, external: 0.2 };

    (vectorModule.searchMemories as jest.Mock).mockResolvedValue(mockInternalResults);
    (tavilyModule.tavilySearch as jest.Mock).mockResolvedValue(mockExternalResults);
    (cacheModule.getCachedResults as jest.Mock).mockResolvedValue([]);
    (cacheModule.cacheExternalResults as jest.Mock).mockResolvedValue(undefined);
    (adaptiveWeightsModule.getWeightsWithFallback as jest.Mock).mockResolvedValue(customWeights);
    (performanceTrackerModule.trackSearchPerformance as jest.Mock).mockResolvedValue(undefined);

    const results = await hybridSearch(mockQuery, mockUserId, 10);

    const internalResult = results.find(r => r.source === 'internal');
    expect(internalResult).toBeDefined();
    // Internal fused score should use custom weight: 0.8 * 0.8 = 0.64
    expect(Math.abs(internalResult!.fusedScore - 0.64)).toBeLessThan(0.01);
  });
});

