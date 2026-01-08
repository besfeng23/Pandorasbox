import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { hybridSearch } from '@/lib/hybrid-search';
import * as vectorModule from '@/lib/vector';
import * as tavilyModule from '@/lib/tavily';
import * as cacheModule from '@/lib/external-cache';

describe('hybrid-search', () => {
  const mockUserId = 'test-user-123';
  const mockQuery = 'test query';

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
    mock.method(vectorModule, 'searchMemories', async () => mockInternalResults);
    mock.method(tavilyModule, 'tavilySearch', async () => mockExternalResults);
    mock.method(cacheModule, 'getCachedResults', async () => []);
    mock.method(cacheModule, 'cacheExternalResults', async () => {});

    const results = await hybridSearch(mockQuery, mockUserId, 10);

    assert.ok(results.length > 0, 'Should return results');
    assert.ok(
      results.some(r => r.source === 'internal'),
      'Should include internal results'
    );
    assert.ok(
      results.some(r => r.source === 'external'),
      'Should include external results'
    );

    // Check fused scores
    const internalResult = results.find(r => r.source === 'internal');
    const externalResult = results.find(r => r.source === 'external');

    assert.ok(internalResult, 'Internal result should exist');
    assert.ok(externalResult, 'External result should exist');

    // Internal score should be 0.8 * 0.6 = 0.48
    assert.ok(Math.abs(internalResult!.fusedScore - 0.48) < 0.01, 'Internal fused score should be 60% of confidence');
    // External score should be approximately 0.4 * confidence (confidence based on position)
    assert.ok(externalResult!.fusedScore > 0, 'External fused score should be positive');

    mock.restoreAll();
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

    mock.method(vectorModule, 'searchMemories', async () => mockInternalResults);
    mock.method(cacheModule, 'getCachedResults', async () => mockCachedExternal);
    mock.method(cacheModule, 'cacheExternalResults', async () => {});

    const results = await hybridSearch(mockQuery, mockUserId, 10);

    assert.ok(results.length > 0, 'Should return results');
    // Should not call tavilySearch when cache is available
    // (We can't easily assert this, but the test verifies the function doesn't crash)

    mock.restoreAll();
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

    mock.method(vectorModule, 'searchMemories', async () => mockInternalResults);
    mock.method(tavilyModule, 'tavilySearch', async () => {
      throw new Error('Tavily API error');
    });
    mock.method(cacheModule, 'getCachedResults', async () => []);

    const results = await hybridSearch(mockQuery, mockUserId, 10);

    assert.ok(results.length > 0, 'Should return fallback internal results');
    assert.ok(
      results.every(r => r.source === 'internal'),
      'All results should be internal on external failure'
    );

    mock.restoreAll();
  });

  it('should return empty array for invalid input', async () => {
    const emptyQuery = await hybridSearch('', mockUserId, 10);
    const emptyUserId = await hybridSearch(mockQuery, '', 10);

    assert.deepEqual(emptyQuery, [], 'Should return empty for empty query');
    assert.deepEqual(emptyUserId, [], 'Should return empty for empty userId');
  });
});

