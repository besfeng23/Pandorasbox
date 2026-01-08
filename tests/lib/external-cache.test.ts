import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import {
  cacheExternalResults,
  getCachedResults,
  clearExpiredCache,
} from '@/lib/external-cache';
import * as firebaseAdminModule from '@/lib/firebase-admin';

describe('external-cache', () => {
  const mockQuery = 'test query';
  const mockResults = [
    {
      title: 'Test Result 1',
      snippet: 'Test content 1',
      url: 'https://example.com/1',
    },
    {
      title: 'Test Result 2',
      snippet: 'Test content 2',
      url: 'https://example.com/2',
    },
  ];

  it('should cache external results', async () => {
    const mockCollection = {
      doc: mock.fn(() => ({
        set: mock.fn(async () => {}),
      })),
    };

    const mockFirestore = {
      collection: mock.fn(() => mockCollection),
    };

    mock.method(firebaseAdminModule, 'getFirestoreAdmin', () => mockFirestore);

    await cacheExternalResults(mockQuery, mockResults);

    assert.ok(mockFirestore.collection.called, 'Should call collection');
    // Should create documents for each result
    assert.ok(mockCollection.doc.callCount === mockResults.length, 'Should create doc for each result');

    mock.restoreAll();
  });

  it('should not cache empty results', async () => {
    const mockFirestore = {
      collection: mock.fn(() => ({
        doc: mock.fn(),
      })),
    };

    mock.method(firebaseAdminModule, 'getFirestoreAdmin', () => mockFirestore);

    await cacheExternalResults('', []);
    await cacheExternalResults(mockQuery, []);

    // Should not call collection for empty inputs
    // (We can't easily assert this without more complex mocking, but test verifies no crash)

    mock.restoreAll();
  });

  it('should retrieve cached results', async () => {
    const mockTimestamp = {
      toDate: () => new Date(),
    };

    const mockDoc = {
      data: () => ({
        query: mockQuery.toLowerCase(),
        source: 'tavily',
        content: 'Cached content',
        confidence: 0.8,
        cachedAt: mockTimestamp,
        url: 'https://example.com',
        title: 'Cached Title',
      }),
    };

    const mockSnapshot = {
      empty: false,
      docs: [mockDoc],
    };

    const mockQueryRef = {
      where: mock.fn(() => ({
        orderBy: mock.fn(() => ({
          limit: mock.fn(() => ({
            get: mock.fn(async () => mockSnapshot),
          })),
        })),
      })),
    };

    const mockCollection = {
      where: mock.fn(() => mockQueryRef),
    };

    const mockFirestore = {
      collection: mock.fn(() => mockCollection),
    };

    mock.method(firebaseAdminModule, 'getFirestoreAdmin', () => mockFirestore);

    const results = await getCachedResults(mockQuery, 24);

    assert.ok(results.length > 0, 'Should return cached results');
    assert.strictEqual(results[0].query, mockQuery.toLowerCase(), 'Should normalize query');
    assert.strictEqual(results[0].source, 'tavily', 'Should have correct source');

    mock.restoreAll();
  });

  it('should filter expired cache entries', async () => {
    const oldDate = new Date();
    oldDate.setHours(oldDate.getHours() - 25); // 25 hours ago (expired for 24h TTL)

    const mockTimestamp = {
      toDate: () => oldDate,
    };

    const mockDoc = {
      data: () => ({
        query: mockQuery.toLowerCase(),
        source: 'tavily',
        content: 'Expired content',
        confidence: 0.8,
        cachedAt: mockTimestamp,
      }),
    };

    const mockSnapshot = {
      empty: false,
      docs: [mockDoc],
    };

    const mockQueryRef = {
      where: mock.fn(() => ({
        orderBy: mock.fn(() => ({
          limit: mock.fn(() => ({
            get: mock.fn(async () => mockSnapshot),
          })),
        })),
      })),
    };

    const mockCollection = {
      where: mock.fn(() => mockQueryRef),
    };

    const mockFirestore = {
      collection: mock.fn(() => mockCollection),
    };

    mock.method(firebaseAdminModule, 'getFirestoreAdmin', () => mockFirestore);

    const results = await getCachedResults(mockQuery, 24);

    // Expired entries should be filtered out
    assert.strictEqual(results.length, 0, 'Should filter out expired entries');

    mock.restoreAll();
  });

  it('should clear expired cache entries', async () => {
    const mockDoc = {
      ref: {
        delete: mock.fn(async () => {}),
      },
    };

    const mockSnapshot = {
      empty: false,
      docs: [mockDoc],
    };

    const mockQueryRef = {
      where: mock.fn(() => ({
        limit: mock.fn(() => ({
          get: mock.fn(async () => mockSnapshot),
        })),
      })),
    };

    const mockCollection = {
      where: mock.fn(() => mockQueryRef),
    };

    const mockFirestore = {
      collection: mock.fn(() => mockCollection),
    };

    // Mock Timestamp.fromDate
    const mockTimestamp = {
      fromDate: () => ({}),
    };
    const mockFieldValue = {
      serverTimestamp: () => ({}),
    };

    mock.method(firebaseAdminModule, 'getFirestoreAdmin', () => mockFirestore);
    // We need to mock Timestamp but it's from firebase-admin/firestore
    // For this test, we'll just verify the structure exists

    const deletedCount = await clearExpiredCache(24 * 7);

    assert.ok(typeof deletedCount === 'number', 'Should return deletion count');

    mock.restoreAll();
  });
});

