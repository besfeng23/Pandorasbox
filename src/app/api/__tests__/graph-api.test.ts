/**
 * Phase 4: Knowledge Graph API Tests
 * @jest-environment node
 */

import { GET, POST } from '@/app/api/system/knowledge/route';
import { NextRequest } from 'next/server';

// Mock dependencies
jest.mock('@/lib/firebase-admin');
jest.mock('@/lib/knowledge-graph');
jest.mock('@/lib/relationship-manager');
jest.mock('@/lib/vector');

describe('Knowledge Graph API', () => {
  const mockRequest = (params: {
    method?: string;
    searchParams?: Record<string, string>;
    body?: any;
    headers?: Record<string, string>;
  }): NextRequest => {
    const url = new URL('http://localhost/api/system/knowledge');
    if (params.searchParams) {
      Object.entries(params.searchParams).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }

    const request = new NextRequest(url, {
      method: params.method || 'GET',
      headers: params.headers || {},
      body: params.body ? JSON.stringify(params.body) : undefined,
    });

    return request;
  };

  describe('GET /api/system/knowledge', () => {
    it('should handle GET request with userId', async () => {
      const request = mockRequest({
        searchParams: { userId: 'test-user' },
      });

      const response = await GET(request);
      expect(response).toBeDefined();
      const json = await response.json();
      expect(json).toHaveProperty('success');
    });

    it('should return 400 when userId is missing', async () => {
      const request = mockRequest({
        searchParams: {},
      });

      const response = await GET(request);
      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/system/knowledge', () => {
    it('should handle POST request with userId', async () => {
      const request = mockRequest({
        method: 'POST',
        body: {
          userId: 'test-user',
          query: 'test query',
        },
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request);
      expect(response).toBeDefined();
    });

    it('should handle POST request with memoryId and content', async () => {
      const request = mockRequest({
        method: 'POST',
        body: {
          userId: 'test-user',
          memoryId: 'memory-1',
          content: 'Test content',
        },
        headers: { 'content-type': 'application/json' },
      });

      const response = await POST(request);
      expect(response).toBeDefined();
    });
  });
});

