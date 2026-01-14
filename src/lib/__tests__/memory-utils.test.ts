// Mock Firebase Admin - jest.mock calls are hoisted
jest.mock('../firebase-admin', () => {
  const mockDocRef = {
    id: 'test-memory-id',
    update: jest.fn(() => Promise.resolve()),
    get: jest.fn(() => Promise.resolve({
      exists: true,
      data: () => ({ userId: 'test-user' }),
    })),
  };
  const mockCollection = {
    add: jest.fn(() => Promise.resolve(mockDocRef)),
    doc: jest.fn((id) => ({
      id: id || 'test-memory-id',
      update: jest.fn(() => Promise.resolve()),
      get: jest.fn(() => Promise.resolve({
        exists: true,
        data: () => ({ userId: 'test-user' }),
      })),
    })),
  };
  const mockBatch = {
    set: jest.fn(),
    commit: jest.fn(() => Promise.resolve()),
  };
  const mockFirestoreAdmin = {
    collection: jest.fn(() => mockCollection),
    batch: jest.fn(() => mockBatch),
  };
  return {
    getFirestoreAdmin: jest.fn(() => mockFirestoreAdmin),
  };
});

// Mock vector embeddings
jest.mock('../vector', () => {
  const mockEmbedding = Array(1536).fill(0.1);
  return {
    generateEmbedding: jest.fn(() => Promise.resolve(mockEmbedding)),
    generateEmbeddingsBatch: jest.fn((texts) => 
      Promise.resolve(texts.map(() => mockEmbedding))
    ),
  };
});

// Mock analytics
jest.mock('../analytics', () => ({
  trackEvent: jest.fn(() => Promise.resolve()),
}));

// Mock knowledge graph
jest.mock('../knowledge-graph', () => ({
  updateKnowledgeGraphFromMemory: jest.fn(() => Promise.resolve()),
}));

// Mock Kairos client
jest.mock('../kairosClient', () => ({
  sendKairosEvent: jest.fn(() => Promise.resolve({ success: true })),
}));

// Mock temporal analysis (optional dependency)
jest.mock('../temporal-analysis', () => ({
  captureGraphSnapshot: jest.fn(() => Promise.resolve()),
}), { virtual: true });

// Mock FieldValue
jest.mock('firebase-admin/firestore', () => ({
  FieldValue: {
    serverTimestamp: jest.fn(() => ({ _methodName: 'serverTimestamp' })),
  },
}));

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  saveMemory,
  saveMemoriesBatch,
  updateMemoryWithEmbedding,
  saveInsightMemory,
  saveQuestionMemory,
} from '../memory-utils';

// Get mock embedding for assertions
const mockEmbedding = Array(1536).fill(0.1);

describe('Memory Utils', () => {
  let mockFirestoreAdmin, mockCollection, mockDocRef, mockBatch;

  beforeEach(() => {
    jest.clearAllMocks();
    const { getFirestoreAdmin } = require('../firebase-admin');
    mockFirestoreAdmin = getFirestoreAdmin();
    mockCollection = mockFirestoreAdmin.collection('memories');
    mockDocRef = mockCollection.doc();
    mockBatch = mockFirestoreAdmin.batch();
    
    mockCollection.add.mockResolvedValue(mockDocRef);
    mockDocRef.update.mockResolvedValue(undefined);
    mockBatch.commit.mockResolvedValue(undefined);
  });

  describe('saveMemory', () => {
    it('should reject invalid input - empty content', async () => {
      const result = await saveMemory({
        content: '',
        userId: 'user-1',
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('cannot be empty');
      expect(mockCollection.add).not.toHaveBeenCalled();
    });

    it('should reject invalid input - missing userId', async () => {
      const result = await saveMemory({
        content: 'Test memory',
        userId: '',
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('User ID is required');
    });

    it('should create memory with defaults', async () => {
      const result = await saveMemory({
        content: 'Test memory content',
        userId: 'user-1',
      });
      
      expect(result.success).toBe(true);
      expect(result.memory_id).toBe('test-memory-id');
      expect(mockCollection.add).toHaveBeenCalled();
      
      const addCall = mockCollection.add.mock.calls[0][0];
      expect(addCall.content).toBe('Test memory content');
      expect(addCall.userId).toBe('user-1');
      expect(addCall.embedding).toEqual(mockEmbedding);
      expect(addCall.source).toBe('system');
      expect(addCall.type).toBe('normal');
    });

    it('should call underlying persistence layer', async () => {
      await saveMemory({
        content: 'Test memory',
        userId: 'user-1',
      });
      
      expect(mockFirestoreAdmin.collection).toHaveBeenCalledWith('memories');
      expect(mockCollection.add).toHaveBeenCalled();
      expect(mockDocRef.update).toHaveBeenCalledWith({ id: 'test-memory-id' });
    });

    it('should emit Kairos event if that path exists', async () => {
      const { sendKairosEvent } = await import('../kairosClient');
      
      await saveMemory({
        content: 'Test memory',
        userId: 'user-1',
      });
      
      expect(sendKairosEvent).toHaveBeenCalledWith(
        'system.lane.memory.created',
        expect.objectContaining({
          memoryId: 'test-memory-id',
          userId: 'user-1',
        })
      );
      
      expect(sendKairosEvent).toHaveBeenCalledWith(
        'system.memory.persisted',
        expect.objectContaining({
          memoryId: 'test-memory-id',
          userId: 'user-1',
        })
      );
    });

    it('should handle downstream failure', async () => {
      const { getFirestoreAdmin } = require('../firebase-admin');
      const admin = getFirestoreAdmin();
      const collection = admin.collection('memories');
      collection.add.mockRejectedValueOnce(new Error('Firestore error'));
      
      const result = await saveMemory({
        content: 'Test memory',
        userId: 'user-1',
      });
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to save memory');
    });
  });

  describe('saveMemoriesBatch', () => {
    it('should return success with 0 saved for empty array', async () => {
      const result = await saveMemoriesBatch([]);
      
      expect(result.success).toBe(true);
      expect(result.saved).toBe(0);
      expect(result.failed).toBe(0);
    });

    it('should filter out invalid memories', async () => {
      const memories = [
        { content: 'Valid 1', userId: 'user-1' },
        { content: '', userId: 'user-1' },
        { content: 'Valid 2', userId: 'user-1' },
        { content: 'Valid 3', userId: '' },
      ];
      
      const result = await saveMemoriesBatch(memories);
      
      expect(result.saved).toBe(2);
      expect(result.failed).toBe(2);
    });

    it('should batch create calls underlying writer N times', async () => {
      const memories = [
        { content: 'Memory 1', userId: 'user-1' },
        { content: 'Memory 2', userId: 'user-1' },
        { content: 'Memory 3', userId: 'user-1' },
      ];
      
      const result = await saveMemoriesBatch(memories);
      
      expect(result.success).toBe(true);
      expect(result.saved).toBe(3);
      expect(result.failed).toBe(0);
      expect(mockBatch.set).toHaveBeenCalledTimes(3);
      expect(mockBatch.commit).toHaveBeenCalled();
    });
  });

  describe('updateMemoryWithEmbedding', () => {
    it('should reject empty content', async () => {
      const result = await updateMemoryWithEmbedding('mem-1', '', 'user-1');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('cannot be empty');
    });

    it('should reject if memory not found', async () => {
      const mockDoc = mockCollection.doc('non-existent');
      mockDoc.get.mockResolvedValueOnce({
        exists: false,
        data: () => null,
      });
      
      const result = await updateMemoryWithEmbedding('non-existent', 'New content', 'user-1');
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('should update memory with new content and embedding', async () => {
      const mockDoc = mockCollection.doc('mem-1');
      mockDoc.get.mockResolvedValueOnce({
        exists: true,
        data: () => ({ userId: 'user-1' }),
      });
      
      const result = await updateMemoryWithEmbedding('mem-1', 'Updated content', 'user-1');
      
      expect(result.success).toBe(true);
      expect(result.memory_id).toBe('mem-1');
      expect(mockDoc.update).toHaveBeenCalledWith({
        content: 'Updated content',
        embedding: mockEmbedding,
        editedAt: expect.anything(),
      });
    });
  });

  describe('saveInsightMemory', () => {
    it('should save memory with insight type', async () => {
      const result = await saveInsightMemory('This is an insight', 'user-1');
      
      expect(result.success).toBe(true);
      expect(mockCollection.add).toHaveBeenCalled();
      
      const addCall = mockCollection.add.mock.calls[0][0];
      expect(addCall.content).toBe('This is an insight');
      expect(addCall.type).toBe('insight');
      expect(addCall.source).toBe('reflection');
    });
  });

  describe('saveQuestionMemory', () => {
    it('should save memory with question_to_ask type', async () => {
      const result = await saveQuestionMemory(
        'What is your favorite color?',
        'user-1',
        'preferences'
      );
      
      expect(result.success).toBe(true);
      expect(mockCollection.add).toHaveBeenCalled();
      
      const addCall = mockCollection.add.mock.calls[0][0];
      expect(addCall.type).toBe('question_to_ask');
      expect(addCall.source).toBe('reflection');
      expect(addCall.content).toContain('Topic: preferences');
      expect(addCall.content).toContain('Question to ask user: What is your favorite color?');
    });
  });
});

