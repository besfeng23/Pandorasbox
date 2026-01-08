import { describe, it, mock } from 'node:test';
import assert from 'node:assert/strict';
import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/chatgpt/hybrid-retrieve/route';
import * as firebaseAdminModule from '@/lib/firebase-admin';
import * as hybridLaneModule from '@/ai/flows/run-hybrid-lane';

describe('hybrid-retrieve API route', () => {
  const mockApiKey = process.env.CHATGPT_API_KEY || 'test-api-key';
  const mockUserId = 'test-user-123';
  const mockUserEmail = 'test@example.com';

  const createMockRequest = (method: 'POST' | 'GET', body?: any, searchParams?: URLSearchParams) => {
    const url = new URL('http://localhost/api/chatgpt/hybrid-retrieve');
    if (searchParams) {
      searchParams.forEach((value, key) => {
        url.searchParams.set(key, value);
      });
    }

    const headers = new Headers();
    headers.set('authorization', `Bearer ${mockApiKey}`);

    if (method === 'POST' && body) {
      return new NextRequest(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });
    }

    return new NextRequest(url, {
      method: 'GET',
      headers,
    });
  };

  it('should return 401 for invalid API key', async () => {
    const request = new NextRequest('http://localhost/api/chatgpt/hybrid-retrieve', {
      method: 'POST',
      headers: {
        'authorization': 'Bearer invalid-key',
      },
      body: JSON.stringify({
        query: 'test query',
        user_email: mockUserEmail,
      }),
    });

    const response = await POST(request);
    const data = await response.json();

    assert.strictEqual(response.status, 401, 'Should return 401 for invalid API key');
    assert.ok(data.error, 'Should include error message');
  });

  it('should return 400 for missing query', async () => {
    const request = createMockRequest('POST', {
      user_email: mockUserEmail,
    });

    const response = await POST(request);
    const data = await response.json();

    assert.strictEqual(response.status, 400, 'Should return 400 for missing query');
    assert.ok(data.error, 'Should include error message');
  });

  it('should return hybrid search results on success', async () => {
    const mockFirebaseUser = {
      uid: mockUserId,
      email: mockUserEmail,
    };

    const mockHybridResults = {
      fusedResults: [
        {
          id: 'result-1',
          content: 'Fused result content',
          source: 'internal' as const,
          confidence: 0.8,
          fusedScore: 0.48,
          timestamp: new Date().toISOString(),
        },
        {
          id: 'result-2',
          content: 'External result content',
          source: 'external' as const,
          confidence: 0.7,
          fusedScore: 0.28,
          url: 'https://example.com',
          title: 'External Title',
        },
      ],
      internalCount: 1,
      externalCount: 1,
      fusedContext: 'Formatted context string',
    };

    const mockAuthAdmin = {
      getUserByEmail: mock.fn(async () => mockFirebaseUser),
    };

    mock.method(firebaseAdminModule, 'getAuthAdmin', () => mockAuthAdmin);
    mock.method(hybridLaneModule, 'runHybridLane', async () => mockHybridResults);

    const request = createMockRequest('POST', {
      query: 'test query',
      user_email: mockUserEmail,
      limit: 10,
    });

    const response = await POST(request);
    const data = await response.json();

    assert.strictEqual(response.status, 200, 'Should return 200 on success');
    assert.strictEqual(data.success, true, 'Should indicate success');
    assert.strictEqual(data.count, 2, 'Should return correct count');
    assert.strictEqual(data.internal_count, 1, 'Should return internal count');
    assert.strictEqual(data.external_count, 1, 'Should return external count');
    assert.ok(Array.isArray(data.results), 'Should return results array');
    assert.ok(data.fused_context, 'Should include fused context');

    mock.restoreAll();
  });

  it('should support GET method with query parameters', async () => {
    const mockFirebaseUser = {
      uid: mockUserId,
      email: mockUserEmail,
    };

    const mockHybridResults = {
      fusedResults: [],
      internalCount: 0,
      externalCount: 0,
      fusedContext: 'No results',
    };

    const mockAuthAdmin = {
      getUserByEmail: mock.fn(async () => mockFirebaseUser),
    };

    mock.method(firebaseAdminModule, 'getAuthAdmin', () => mockAuthAdmin);
    mock.method(hybridLaneModule, 'runHybridLane', async () => mockHybridResults);

    const searchParams = new URLSearchParams({
      query: 'test query',
      user_email: mockUserEmail,
      limit: '10',
    });

    const request = createMockRequest('GET', undefined, searchParams);

    const response = await GET(request);
    const data = await response.json();

    assert.strictEqual(response.status, 200, 'Should return 200 on success');
    assert.strictEqual(data.success, true, 'Should indicate success');

    mock.restoreAll();
  });

  it('should return 404 for non-existent user', async () => {
    const mockAuthAdmin = {
      getUserByEmail: mock.fn(async () => {
        const error = new Error('User not found');
        (error as any).code = 'auth/user-not-found';
        throw error;
      }),
    };

    mock.method(firebaseAdminModule, 'getAuthAdmin', () => mockAuthAdmin);

    const request = createMockRequest('POST', {
      query: 'test query',
      user_email: 'nonexistent@example.com',
    });

    const response = await POST(request);
    const data = await response.json();

    assert.strictEqual(response.status, 404, 'Should return 404 for non-existent user');
    assert.ok(data.error, 'Should include error message');

    mock.restoreAll();
  });
});

