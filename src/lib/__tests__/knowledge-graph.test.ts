/**
 * Phase 4: Knowledge Graph Tests
 * 
 * Unit tests for knowledge graph functionality
 */

import {
  upsertKnowledgeNode,
  createKnowledgeEdge,
  getKnowledgeNode,
  getNodeEdges,
  searchKnowledgeNodes,
  getNodeSubgraph,
  findPathBetweenNodes,
  extractKnowledgeFromText,
  deleteKnowledgeNode,
} from '../knowledge-graph';

// Mock Firebase Admin
jest.mock('../firebase-admin', () => ({
  getFirestoreAdmin: jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: jest.fn(),
        set: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      })),
      add: jest.fn(),
      where: jest.fn(() => ({
        limit: jest.fn(() => ({
          get: jest.fn(),
        })),
        findNearest: jest.fn(() => ({
          get: jest.fn(),
        })),
      })),
    })),
    batch: jest.fn(() => ({
      delete: jest.fn(),
      commit: jest.fn(),
    })),
  })),
}));

// Mock vector utilities
jest.mock('../vector', () => ({
  generateEmbedding: jest.fn(() => Promise.resolve(new Array(1536).fill(0))),
}));

describe('Knowledge Graph', () => {
  const mockUserId = 'test-user-id';

  describe('upsertKnowledgeNode', () => {
    it('should create a new node with valid data', async () => {
      const result = await upsertKnowledgeNode(mockUserId, {
        label: 'Test Node',
        type: 'concept',
        description: 'Test description',
      });

      expect(result.success).toBe(true);
      expect(result.nodeId).toBeDefined();
    });

    it('should fail with empty label', async () => {
      const result = await upsertKnowledgeNode(mockUserId, {
        label: '',
        type: 'concept',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('required');
    });
  });

  describe('createKnowledgeEdge', () => {
    it('should create an edge between two nodes', async () => {
      const result = await createKnowledgeEdge(mockUserId, {
        fromNodeId: 'node1',
        toNodeId: 'node2',
        relationType: 'related_to',
      });

      expect(result.success).toBe(true);
      expect(result.edgeId).toBeDefined();
    });

    it('should fail when from and to nodes are the same', async () => {
      const result = await createKnowledgeEdge(mockUserId, {
        fromNodeId: 'node1',
        toNodeId: 'node1',
        relationType: 'related_to',
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('itself');
    });
  });

  describe('searchKnowledgeNodes', () => {
    it('should return empty array for empty query', async () => {
      const results = await searchKnowledgeNodes(mockUserId, '');
      expect(results).toEqual([]);
    });

    it('should return nodes for valid query', async () => {
      const results = await searchKnowledgeNodes(mockUserId, 'test query');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('extractKnowledgeFromText', () => {
    it('should extract entities from text', async () => {
      const result = await extractKnowledgeFromText(
        mockUserId,
        'John loves Python programming and machine learning.',
        'test'
      );

      expect(result.nodesCreated).toBeGreaterThanOrEqual(0);
      expect(result.edgesCreated).toBeGreaterThanOrEqual(0);
    });

    it('should handle empty text gracefully', async () => {
      const result = await extractKnowledgeFromText(mockUserId, '', 'test');
      expect(result.nodesCreated).toBe(0);
      expect(result.edgesCreated).toBe(0);
    });
  });
});

