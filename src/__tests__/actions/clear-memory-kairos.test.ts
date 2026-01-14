// Mock OpenAI/vector BEFORE other imports
jest.mock('@/lib/vector', () => ({
  generateEmbedding: jest.fn(() => Promise.resolve(Array(1536).fill(0.1))),
  generateEmbeddingsBatch: jest.fn(() => Promise.resolve([])),
  searchHistory: jest.fn(() => Promise.resolve([])),
  searchMemories: jest.fn(() => Promise.resolve([])),
}));

// Mock dependencies BEFORE imports
jest.mock('@/lib/firebase-admin', () => {
  const mockDoc = { id: 'test-doc', ref: { id: 'test-doc' } };
  const mockSnapshot = {
    docs: [mockDoc, mockDoc, mockDoc], // 3 docs each
    empty: false,
    size: 3,
  };
  const mockBatch = {
    delete: jest.fn(),
    commit: jest.fn(() => Promise.resolve()),
  };
  const mockCollection = {
    where: jest.fn(() => ({
      get: jest.fn(() => Promise.resolve(mockSnapshot)),
    })),
    doc: jest.fn(() => ({
      collection: jest.fn(() => ({
        get: jest.fn(() => Promise.resolve({ docs: [] })),
      })),
    })),
  };
  return {
    getFirestoreAdmin: jest.fn(() => ({
      collection: jest.fn((name) => {
        if (name === 'users') {
          return {
            doc: jest.fn(() => ({
              collection: jest.fn(() => ({
                get: jest.fn(() => Promise.resolve({ docs: [] })),
              })),
            })),
          };
        }
        return mockCollection;
      }),
      batch: jest.fn(() => mockBatch),
    })),
    getAuthAdmin: jest.fn(() => ({
      verifyIdToken: jest.fn(() => Promise.resolve({ uid: 'test-user-123' })),
    })),
  };
});

jest.mock('@/lib/kairosClient', () => ({
  sendKairosEvent: jest.fn(() => Promise.resolve({ success: true, eventId: 'test-event-id' })),
}));

jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import { clearMemory } from '@/app/actions/knowledge';
import * as kairosModule from '@/lib/kairosClient';

describe('clearMemory Action - Kairos Events', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should emit system.clear_memory.completed event with deleted counts', async () => {
    const result = await clearMemory('mock-token');
    
    expect(result.success).toBe(true);
    
    await new Promise(resolve => setTimeout(resolve, 100)); // Wait for async event
    
    expect(kairosModule.sendKairosEvent).toHaveBeenCalledWith(
      'system.clear_memory.completed',
      expect.objectContaining({
        userId: 'test-user-123',
        success: true,
        deletedCounts: expect.objectContaining({
          threads: expect.any(Number),
          messages: expect.any(Number),
          memories: expect.any(Number),
          artifacts: expect.any(Number),
          state: expect.any(Number),
        }),
      })
    );
  });

  // Note: Testing failure case requires complex mocking setup
  // The success case above verifies the event is emitted correctly with deleted counts
});

