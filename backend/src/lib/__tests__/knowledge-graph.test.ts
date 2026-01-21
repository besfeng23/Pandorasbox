/**
 * Phase 4: Knowledge Graph Tests
 * 
 * Unit tests for knowledge graph functionality
 */

import {
  extractConcepts,
  searchKnowledgeNodes,
} from '../knowledge-graph';

// Mock Firebase Admin
jest.mock('../firebase-admin', () => ({
  getFirestoreAdmin: jest.fn(() => ({
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({
            docs: [
              {
                data: () => ({
                  id: 'node1',
                  label: 'Test Node 1',
                  userId: 'test-user-id',
                  type: 'concept',
                  memoryIds: [],
                  occurrences: 1,
                }),
              },
              {
                data: () => ({
                  id: 'node2',
                  label: 'Test Node 2',
                  userId: 'test-user-id',
                  type: 'entity',
                  memoryIds: [],
                  occurrences: 2,
                }),
              },
            ],
          })),
        })),
      })),
    })),
  })),
}));

describe('Knowledge Graph', () => {
  const mockUserId = 'test-user-id';

  describe('extractConcepts', () => {
    it('should extract concepts from text', () => {
      const text = 'John loves Python programming and machine learning';
      const concepts = extractConcepts(text);
      expect(Array.isArray(concepts)).toBe(true);
      expect(concepts.length).toBeGreaterThan(0);
    });

    it('should return empty array for empty text', () => {
      const concepts = extractConcepts('');
      expect(concepts).toEqual([]);
    });

    it('should filter out stop words', () => {
      const text = 'the and a an';
      const concepts = extractConcepts(text);
      expect(concepts.length).toBe(0);
    });
  });

  describe('searchKnowledgeNodes', () => {
    it('should return empty array for empty query', async () => {
      const results = await searchKnowledgeNodes(mockUserId, '');
      expect(results).toEqual([]);
    });

    it('should return nodes for valid query', async () => {
      const results = await searchKnowledgeNodes(mockUserId, 'test');
      expect(Array.isArray(results)).toBe(true);
    });
  });
});

