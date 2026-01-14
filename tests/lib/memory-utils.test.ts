// Tests for src/lib/memory-utils.ts

jest.mock('../../src/lib/firebase-admin', () => {
  const batch = {
    set: jest.fn(),
    commit: jest.fn(() => Promise.resolve()),
  };
  const collection = jest.fn(() => ({
    add: jest.fn(async (data: any) => ({
      id: 'memory-1',
      update: jest.fn(() => Promise.resolve()),
    })),
    doc: jest.fn(() => ({
      id: 'doc-1',
      get: jest.fn(async () => ({
        exists: true,
        data: () => ({ userId: 'user-123' }),
      })),
    })),
  }));

  return {
    getFirestoreAdmin: jest.fn(() => ({
      collection,
      batch: jest.fn(() => batch),
    })),
  };
});

// IMPORTANT: ensure OpenAI shims are loaded before importing any vector/memory code
import 'openai/shims/node';

jest.mock('../../src/lib/vector', () => ({
  generateEmbedding: jest.fn(async () => Array(1536).fill(0.1)),
  generateEmbeddingsBatch: jest.fn(async (texts: string[]) =>
    texts.map(() => Array(1536).fill(0.1))
  ),
}));

jest.mock('../../src/lib/analytics', () => ({
  trackEvent: jest.fn(async () => {}),
}));

jest.mock('../../src/lib/knowledge-graph', () => ({
  updateKnowledgeGraphFromMemory: jest.fn(async () => {}),
}));

jest.mock('../../src/lib/kairosClient', () => ({
  sendKairosEvent: jest.fn(async () => ({ success: true, eventId: 'evt-1' })),
}));

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import * as memoryUtils from '../../src/lib/memory-utils';
const { saveMemory, saveMemoriesBatch, saveInsightMemory, saveQuestionMemory } = memoryUtils;

describe('memory-utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('saveMemory returns error for empty content', async () => {
    const result = await saveMemory({
      content: '   ',
      userId: 'user-123',
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Memory content cannot be empty.');
  });

  it('saveMemory returns error for missing userId', async () => {
    const result = await saveMemory({
      content: 'Test memory',
      // @ts-expect-error testing missing userId path
      userId: '',
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('User ID is required.');
  });

  it('saveMemoriesBatch returns early for empty array', async () => {
    const result = await saveMemoriesBatch([]);

    expect(result.success).toBe(true);
    expect(result.saved).toBe(0);
    expect(result.failed).toBe(0);
    expect(result.message).toBe('No memories to save.');
  });

  it('saveMemoriesBatch returns error when all memories are invalid', async () => {
    const result = await saveMemoriesBatch([
      // missing content and userId
      { content: '   ', userId: '' } as any,
    ]);

    expect(result.success).toBe(false);
    expect(result.saved).toBe(0);
    expect(result.failed).toBe(1);
    expect(result.message).toBe('No valid memories to save.');
  });

  // Note: saveInsightMemory and saveQuestionMemory are thin wrappers around saveMemory.
  // They are indirectly covered by saveMemoriesBatch and higher-level flows.
});


