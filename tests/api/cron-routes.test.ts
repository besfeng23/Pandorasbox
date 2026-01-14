/**
 * Tests for cron route endpoints
 * 
 * Tests auth, idempotency, response codes, and error handling for:
 * - /api/cron/cleanup
 * - /api/cron/context-decay
 * - /api/cron/daily-briefing
 * - /api/cron/meta-learning
 * - /api/cron/nightly-reflection
 * - /api/cron/reindex-memories
 * 
 * @jest-environment node
 */

// Mock Next.js server types BEFORE importing routes to prevent Request initialization issues
jest.mock('next/server', () => {
  // Create minimal Request/Response/Headers classes for Next.js
  function MockRequest(input, init) {
    if (typeof input === 'string') {
      this.url = input;
    } else if (input && input.url) {
      this.url = input.url;
    } else {
      this.url = 'http://localhost:3000/api/cron/test';
    }
    this.method = ((init && init.method) || 'GET').toUpperCase();
    const headersMap = new Map(Object.entries((init && init.headers) || {}));
    this.headers = {
      get: function(name) {
        return headersMap.get(name.toLowerCase()) || null;
      },
    };
  }

  function MockResponse(body, init) {
    this.body = body;
    this.status = (init && init.status) || 200;
    this.headers = new Map(Object.entries((init && init.headers) || {}));
  }
  
  MockResponse.prototype.json = function() {
    return Promise.resolve(this.body);
  };

  return {
    NextRequest: MockRequest,
    NextResponse: {
      json: function(body, init) {
        return new MockResponse(body, init);
      },
    },
  };
});

// Mock firebase-admin/firestore before other mocks
const createMockTimestampInstance = function(date) {
  return {
    toDate: function() { return date; },
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: (date.getTime() % 1000) * 1000000,
  };
};

jest.mock('firebase-admin/firestore', () => {
  const mockTimestamp = {
    fromDate: jest.fn(function(date) { return createMockTimestampInstance(date); }),
    now: jest.fn(function() { return createMockTimestampInstance(new Date()); }),
  };
  return {
    FieldValue: {
      serverTimestamp: jest.fn(function() { return { _methodName: 'serverTimestamp' }; }),
      increment: jest.fn(function(n) { return { _methodName: 'increment', _value: n }; }),
      delete: jest.fn(function() { return { _methodName: 'delete' }; }),
    },
    Timestamp: mockTimestamp,
  };
});

// Mock firebase-admin module - must export the same Timestamp structure
jest.mock('firebase-admin', () => {
  const mockTimestamp = {
    fromDate: jest.fn(function(date) { return createMockTimestampInstance(date); }),
    now: jest.fn(function() { return createMockTimestampInstance(new Date()); }),
  };
  const mockAdmin = {
    firestore: {
      Timestamp: mockTimestamp,
    },
    apps: [],
  };
  // Return both as default export and as the object itself for compatibility
  return mockAdmin;
});

// Mock dependencies BEFORE imports to prevent module initialization
// Use relative path for jest.mock as path aliases may not work in jest.mock
jest.mock('../../src/lib/firebase-admin', function() {
  // Create a mock document with ref
  function createMockDoc(id) {
    if (id === undefined) id = 'doc-id';
    var ref = { id: id, path: 'collection/' + id };
    return {
      id: id,
      ref: ref,
      data: jest.fn(function() { return { createdAt: new Date(), importance: 0.5 }; }),
      exists: true,
    };
  }

  // Create chainable query mock that returns empty snapshots by default
  function createQueryMock(docs) {
    if (docs === undefined) docs = [];
    var query = {
      where: jest.fn(function() { return query; }),
      orderBy: jest.fn(function() { return query; }),
      limit: jest.fn(function() { return query; }),
      startAfter: jest.fn(function() { return query; }),
      get: jest.fn(function() { 
        return Promise.resolve({ 
          docs: docs, 
          empty: docs.length === 0, 
          size: docs.length 
        }); 
      }),
    };
    return query;
  }

  function createCollectionMock() {
    var query = createQueryMock([]);
    return {
      where: query.where,
      orderBy: query.orderBy,
      limit: query.limit,
      startAfter: query.startAfter,
      get: jest.fn(function() { return Promise.resolve({ docs: [], empty: true, size: 0 }); }),
      doc: jest.fn(function(docId) {
        var id = docId || 'doc-id';
        var ref = { id: id, path: 'collection/' + id };
        return {
          id: id,
          ref: ref,
          get: jest.fn(function() { 
            return Promise.resolve({ 
              exists: false, 
              data: function() { return null; }, 
              id: id 
            }); 
          }),
          set: jest.fn(function() { return Promise.resolve(); }),
          update: jest.fn(function() { return Promise.resolve(); }),
          delete: jest.fn(function() { return Promise.resolve(); }),
          collection: jest.fn(function() { return createCollectionMock(); }),
        };
      }),
      add: jest.fn(function() { return Promise.resolve({ id: 'new-doc-id' }); }),
    };
  }

  return {
    getFirestoreAdmin: jest.fn(function() {
      return {
        collection: jest.fn(function() { return createCollectionMock(); }),
        batch: jest.fn(function() {
          return {
            delete: jest.fn(),
            update: jest.fn(),
            set: jest.fn(),
            commit: jest.fn(function() { return Promise.resolve(); }),
          };
        }),
      };
    }),
  };
});

jest.mock('../../src/lib/vector', function() {
  return {
    generateEmbedding: jest.fn(function() { return Promise.resolve(new Array(1536).fill(0.1)); }),
  };
});

jest.mock('../../src/lib/memory-utils', function() {
  return {
    saveInsightMemory: jest.fn(function() { return Promise.resolve({ success: true, id: 'insight-id' }); }),
    saveQuestionMemory: jest.fn(function() { return Promise.resolve({ success: true, id: 'question-id' }); }),
  };
});

jest.mock('../../src/ai/agents/nightly-reflection', function() {
  return {
    runReflectionFlow: jest.fn(function() {
      return Promise.resolve({
        processedCount: 5,
        insights: ['Insight 1', 'Insight 2'],
        weakAnswer: {
          topic: 'Test Topic',
          question: 'Test Question',
        },
      });
    }),
  };
});

jest.mock('../../src/ai/flows/run-self-improvement', function() {
  return {
    runSelfImprovement: jest.fn(function() {
      return Promise.resolve({
        usersAnalyzed: 10,
        usersUpdated: 8,
        avgSatisfactionChange: 0.05,
        systemStats: {
          totalSearches: 100,
          avgResponseTime: 200,
        },
        performanceAnalysis: {
          recommendations: ['Recommendation 1'],
        },
        feedbackAnalysis: {
          improvementSuggestions: ['Suggestion 1'],
        },
      });
    }),
  };
});

jest.mock('openai', () => {
  return jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: jest.fn(() => Promise.resolve({
          choices: [{
            message: {
              content: 'Test briefing content',
            },
          }],
        })),
      },
    },
  }));
});

// Import routes - must use import statements so Next.js Jest can transform TypeScript
// These imports are after all mocks, so the mocks will be in place
import { NextRequest } from 'next/server';
import { POST as cleanupPOST, GET as cleanupGET } from '@/app/api/cron/cleanup/route';
import { POST as contextDecayPOST, GET as contextDecayGET } from '@/app/api/cron/context-decay/route';
import { POST as dailyBriefingPOST, GET as dailyBriefingGET } from '@/app/api/cron/daily-briefing/route';
import { GET as metaLearningGET, POST as metaLearningPOST } from '@/app/api/cron/meta-learning/route';
import { POST as nightlyReflectionPOST, GET as nightlyReflectionGET } from '@/app/api/cron/nightly-reflection/route';
import { POST as reindexMemoriesPOST, GET as reindexMemoriesGET } from '@/app/api/cron/reindex-memories/route';

describe('Cron Routes', () => {
  const createMockRequest = function(options) {
    if (options === undefined) options = {};
    const url = 'http://localhost:3000/api/cron/test';
    
    return new NextRequest(url, {
      method: options.method || 'POST',
      headers: options.headers || {},
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset CRON_SECRET for tests
    delete process.env.CRON_SECRET;
    
    // Reset getFirestoreAdmin mock to use default implementation
    // This ensures that tests that override mockReturnValue don't affect subsequent tests
    const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
    getFirestoreAdmin.mockReset();
    // Restore the default implementation from the jest.mock() setup
    getFirestoreAdmin.mockImplementation(function() {
      // Recreate the default mock structure (same as in jest.mock above)
      function createMockDoc(id) {
        if (id === undefined) id = 'doc-id';
        var ref = { id: id, path: 'collection/' + id };
        return {
          id: id,
          ref: ref,
          data: jest.fn(function() { return { createdAt: new Date(), importance: 0.5 }; }),
          exists: true,
        };
      }

      function createQueryMock(docs) {
        if (docs === undefined) docs = [];
        var query = {
          where: jest.fn(function() { return query; }),
          orderBy: jest.fn(function() { return query; }),
          limit: jest.fn(function() { return query; }),
          startAfter: jest.fn(function() { return query; }),
          get: jest.fn(function() { 
            return Promise.resolve({ 
              docs: docs, 
              empty: docs.length === 0, 
              size: docs.length 
            }); 
          }),
        };
        return query;
      }

      function createCollectionMock() {
        var query = createQueryMock([]);
        return {
          where: query.where,
          orderBy: query.orderBy,
          limit: query.limit,
          startAfter: query.startAfter,
          get: jest.fn(function() { return Promise.resolve({ docs: [], empty: true, size: 0 }); }),
          doc: jest.fn(function(docId) {
            var id = docId || 'doc-id';
            var ref = { id: id, path: 'collection/' + id };
            return {
              id: id,
              ref: ref,
              get: jest.fn(function() { 
                return Promise.resolve({ 
                  exists: false, 
                  data: function() { return null; }, 
                  id: id 
                }); 
              }),
              set: jest.fn(function() { return Promise.resolve(); }),
              update: jest.fn(function() { return Promise.resolve(); }),
              delete: jest.fn(function() { return Promise.resolve(); }),
              collection: jest.fn(function() { return createCollectionMock(); }),
            };
          }),
          add: jest.fn(function() { return Promise.resolve({ id: 'new-doc-id' }); }),
        };
      }

      return {
        collection: jest.fn(function() { return createCollectionMock(); }),
        batch: jest.fn(function() {
          return {
            delete: jest.fn(),
            update: jest.fn(),
            set: jest.fn(),
            commit: jest.fn(function() { return Promise.resolve(); }),
          };
        }),
      };
    });
  });

  describe('/api/cron/cleanup', () => {
    it('should return 200 on successful cleanup', async () => {
      const request = createMockRequest({ method: 'POST' });
      const response = await cleanupPOST(request);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json).toHaveProperty('deletedThreads');
      expect(json).toHaveProperty('deletedMemories');
      expect(json).toHaveProperty('deletedHistory');
    });

    it('should support GET method', async () => {
      const request = createMockRequest({ method: 'GET' });
      const response = await cleanupGET(request);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const mockFirestore = {
        collection: jest.fn(() => {
          throw new Error('Database error');
        }),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'POST' });
      const response = await cleanupPOST(request);
      
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe('Cleanup failed');
    });

    it('should be idempotent (same result on repeated calls)', async () => {
      const request1 = createMockRequest({ method: 'POST' });
      const response1 = await cleanupPOST(request1);
      const json1 = await response1.json();

      const request2 = createMockRequest({ method: 'POST' });
      const response2 = await cleanupPOST(request2);
      const json2 = await response2.json();

      // Both should succeed with same structure
      expect(response1.status).toBe(200);
      expect(response2.status).toBe(200);
      expect(json1).toHaveProperty('success');
      expect(json2).toHaveProperty('success');
    });
  });

  describe('/api/cron/context-decay', () => {
    it('should return 401 when CRON_SECRET is set but auth header is missing', async () => {
      process.env.CRON_SECRET = 'test-secret';
      const request = createMockRequest({ method: 'GET' });
      const response = await contextDecayGET(request);
      
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('should return 401 when CRON_SECRET is set but auth header is invalid', async () => {
      process.env.CRON_SECRET = 'test-secret';
      const request = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer wrong-secret' },
      });
      const response = await contextDecayGET(request);
      
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('should return 200 when CRON_SECRET is set and auth header is valid', async () => {
      process.env.CRON_SECRET = 'test-secret';
      const request = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer test-secret' },
      });
      const response = await contextDecayGET(request);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json).toHaveProperty('memoriesUpdated');
      expect(json).toHaveProperty('contextsUpdated');
    });

    it('should return 200 when CRON_SECRET is not set', async () => {
      const request = createMockRequest({ method: 'POST' });
      const response = await contextDecayPOST(request);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });

    it('should handle errors gracefully', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const mockFirestore = {
        collection: jest.fn(() => {
          throw new Error('Database error');
        }),
        batch: jest.fn(() => ({
          update: jest.fn(),
          commit: jest.fn(() => Promise.reject(new Error('Batch error'))),
        })),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'POST' });
      const response = await contextDecayPOST(request);
      
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe('Failed to decay context');
    });
  });

  describe('/api/cron/daily-briefing', () => {
    it('should return 200 on successful briefing generation', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const mockDoc = {
        exists: true,
        data: () => ({ note: 'Test context' }),
      };
      const mockUserDoc = { id: 'user-1' };
      const mockUsersSnapshot = {
        empty: false,
        docs: [mockUserDoc],
      };
      
      const mockFirestore = {
        collection: jest.fn(function(collectionName) {
          if (collectionName === 'users') {
            return {
              get: jest.fn(() => Promise.resolve(mockUsersSnapshot)),
              doc: jest.fn(() => ({
                collection: jest.fn(() => ({
                  doc: jest.fn(() => ({
                    get: jest.fn(() => Promise.resolve(mockDoc)),
                  })),
                  add: jest.fn(() => Promise.resolve({ id: 'briefing-id' })),
                })),
              })),
            };
          }
          return {};
        }),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'POST' });
      const response = await dailyBriefingPOST(request);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json).toHaveProperty('processed');
      expect(json).toHaveProperty('errors');
    });

    it('should return 200 when no users found', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const mockFirestore = {
        collection: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({ empty: true })),
        })),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'POST' });
      const response = await dailyBriefingPOST(request);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.processed).toBe(0);
      expect(json.message).toContain('No users found');
    });

    it('should support GET method', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const mockFirestore = {
        collection: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({ empty: true })),
        })),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'GET' });
      const response = await dailyBriefingGET(request);
      
      expect(response.status).toBe(200);
    });

    it('should handle errors gracefully', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const mockFirestore = {
        collection: jest.fn(() => {
          throw new Error('Database error');
        }),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'POST' });
      const response = await dailyBriefingPOST(request);
      
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe('Daily briefing failed');
    });
  });

  describe('/api/cron/meta-learning', () => {
    it('should return 401 when CRON_SECRET is set but auth header is missing', async () => {
      process.env.CRON_SECRET = 'test-secret';
      const request = createMockRequest({ method: 'GET' });
      const response = await metaLearningGET(request);
      
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('should return 401 when CRON_SECRET is set but auth header is invalid', async () => {
      process.env.CRON_SECRET = 'test-secret';
      const request = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer wrong-secret' },
      });
      const response = await metaLearningGET(request);
      
      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe('Unauthorized');
    });

    it('should return 200 when CRON_SECRET is set and auth header is valid', async () => {
      process.env.CRON_SECRET = 'test-secret';
      const request = createMockRequest({
        method: 'GET',
        headers: { authorization: 'Bearer test-secret' },
      });
      const response = await metaLearningGET(request);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json).toHaveProperty('result');
      expect(json.result).toHaveProperty('usersAnalyzed');
      expect(json.result).toHaveProperty('usersUpdated');
    });

    it('should return 200 when CRON_SECRET is not set', async () => {
      const request = createMockRequest({ method: 'GET' });
      const response = await metaLearningGET(request);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
    });

    it('should support POST method', async () => {
      const request = createMockRequest({ method: 'POST' });
      const response = await metaLearningPOST(request);
      
      expect(response.status).toBe(200);
    });

    it('should handle errors gracefully', async () => {
      const { runSelfImprovement } = require('../../src/ai/flows/run-self-improvement');
      runSelfImprovement.mockRejectedValue(new Error('Self-improvement failed'));

      const request = createMockRequest({ method: 'GET' });
      const response = await metaLearningGET(request);
      
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Failed to run meta-learning');
    });
  });

  describe('/api/cron/nightly-reflection', () => {
    it('should return 200 on successful reflection', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const mockUserDoc = { id: 'user-1' };
      const mockUsersSnapshot = {
        empty: false,
        docs: [mockUserDoc],
      };
      
      const mockFirestore = {
        collection: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve(mockUsersSnapshot)),
        })),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'POST' });
      const response = await nightlyReflectionPOST(request);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json).toHaveProperty('processed');
      expect(json).toHaveProperty('insightsCreated');
      expect(json).toHaveProperty('questionsCreated');
      expect(json).toHaveProperty('errors');
    });

    it('should return 200 when no users found', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const mockFirestore = {
        collection: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({ empty: true })),
        })),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'POST' });
      const response = await nightlyReflectionPOST(request);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.processed).toBe(0);
      expect(json.message).toContain('No users found');
    });

    it('should support GET method', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const mockFirestore = {
        collection: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({ empty: true })),
        })),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'GET' });
      const response = await nightlyReflectionGET(request);
      
      expect(response.status).toBe(200);
    });

    it('should handle errors gracefully', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const mockFirestore = {
        collection: jest.fn(() => {
          throw new Error('Database error');
        }),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'POST' });
      const response = await nightlyReflectionPOST(request);
      
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.error).toBe('Nightly reflection failed');
    });
  });

  describe('/api/cron/reindex-memories', () => {
    it('should return 200 on successful reindexing', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const mockDoc = {
        id: 'memory-1',
        data: () => ({
          content: 'Test memory content',
          embedding: null, // Missing embedding
        }),
        ref: { id: 'memory-1' },
      };
      const mockSnapshot = {
        empty: false,
        size: 1,
        docs: [mockDoc],
      };
      
      const mockFirestore = {
        collection: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(() => Promise.resolve(mockSnapshot)),
              startAfter: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ empty: true })),
              })),
            })),
          })),
        })),
        batch: jest.fn(() => ({
          update: jest.fn(),
          commit: jest.fn(() => Promise.resolve()),
        })),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'POST' });
      const response = await reindexMemoriesPOST(request);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json).toHaveProperty('processed');
      expect(json).toHaveProperty('skipped');
      expect(json).toHaveProperty('errors');
    });

    it('should skip memories that already have valid embeddings', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const validEmbedding = new Array(1536).fill(0.5); // Valid embedding
      const mockDoc = {
        id: 'memory-1',
        data: () => ({
          content: 'Test memory content',
          embedding: validEmbedding,
        }),
        ref: { id: 'memory-1' },
      };
      const mockSnapshot = {
        empty: false,
        size: 1,
        docs: [mockDoc],
      };
      
      const mockFirestore = {
        collection: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(() => Promise.resolve(mockSnapshot)),
              startAfter: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ empty: true })),
              })),
            })),
          })),
        })),
        batch: jest.fn(() => ({
          update: jest.fn(),
          commit: jest.fn(() => Promise.resolve()),
        })),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'POST' });
      const response = await reindexMemoriesPOST(request);
      
      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.skipped).toBeGreaterThan(0);
    });

    it('should support GET method', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const mockFirestore = {
        collection: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            limit: jest.fn(() => ({
              get: jest.fn(() => Promise.resolve({ empty: true })),
            })),
          })),
        })),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'GET' });
      const response = await reindexMemoriesGET(request);
      
      expect(response.status).toBe(200);
    });

    it('should handle errors gracefully', async () => {
      const { getFirestoreAdmin } = require('../../src/lib/firebase-admin');
      const mockFirestore = {
        collection: jest.fn(() => {
          throw new Error('Database error');
        }),
      };
      getFirestoreAdmin.mockReturnValue(mockFirestore);

      const request = createMockRequest({ method: 'POST' });
      const response = await reindexMemoriesPOST(request);
      
      expect(response.status).toBe(500);
      const json = await response.json();
      expect(json.success).toBe(false);
      expect(json.error).toBe('Reindex failed');
    });
  });
});

