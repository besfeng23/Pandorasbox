/**
 * Hybrid Retrieve API Tests
 * 
 * Jest tests for hybrid-retrieve API route
 * @jest-environment node
 */

import { NextRequest } from 'next/server';
import { POST, GET } from '@/app/api/chatgpt/hybrid-retrieve/route';
import * as firebaseAdminModule from '@/lib/firebase-admin';
import * as hybridLaneModule from '@/ai/flows/run-hybrid-lane';

jest.mock('@/lib/firebase-admin');
jest.mock('@/ai/flows/run-hybrid-lane');

describe('hybrid-retrieve API route', () => {
  const mockUserId = 'test-user-123';
  const mockUserEmail = 'test@example.com';
  const mockApiKey = 'test-api-key-123';

  // Set the API key in environment for tests
  const originalEnv = process.env.CHATGPT_API_KEY;
  beforeAll(() => {
    process.env.CHATGPT_API_KEY = mockApiKey;
  });

  afterAll(() => {
    if (originalEnv) {
      process.env.CHATGPT_API_KEY = originalEnv;
    } else {
      delete process.env.CHATGPT_API_KEY;
    }
  });

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

  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

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

    expect(response.status).toBe(401);
    expect(data.error).toBeTruthy();
  });

  it('should return 400 for missing query', async () => {
    const request = createMockRequest('POST', {
      user_email: mockUserEmail,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBeTruthy();
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
      getUserByEmail: jest.fn().mockResolvedValue(mockFirebaseUser),
    };

    jest.spyOn(firebaseAdminModule, 'getAuthAdmin').mockReturnValue(mockAuthAdmin as any);
    jest.spyOn(hybridLaneModule, 'runHybridLane').mockResolvedValue(mockHybridResults);

    const request = createMockRequest('POST', {
      query: 'test query',
      user_email: mockUserEmail,
      limit: 10,
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.count).toBe(2);
    expect(data.internal_count).toBe(1);
    expect(data.external_count).toBe(1);
    expect(Array.isArray(data.results)).toBe(true);
    expect(data.fused_context).toBeTruthy();
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
      getUserByEmail: jest.fn().mockResolvedValue(mockFirebaseUser),
    };

    jest.spyOn(firebaseAdminModule, 'getAuthAdmin').mockReturnValue(mockAuthAdmin as any);
    jest.spyOn(hybridLaneModule, 'runHybridLane').mockResolvedValue(mockHybridResults);

    const searchParams = new URLSearchParams({
      query: 'test query',
      user_email: mockUserEmail,
      limit: '10',
    });

    const request = createMockRequest('GET', undefined, searchParams);

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
  });

  it('should return 404 for non-existent user', async () => {
    const mockAuthAdmin = {
      getUserByEmail: jest.fn().mockRejectedValue(
        Object.assign(new Error('User not found'), { code: 'auth/user-not-found' })
      ),
    };

    jest.spyOn(firebaseAdminModule, 'getAuthAdmin').mockReturnValue(mockAuthAdmin as any);

    const request = createMockRequest('POST', {
      query: 'test query',
      user_email: 'nonexistent@example.com',
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBeTruthy();
  });
});
