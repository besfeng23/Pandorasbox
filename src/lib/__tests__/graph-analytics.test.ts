/**
 * Phase 5: Graph Analytics Tests
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  analyzeKnowledgeGraph,
  calculateGraphHealth,
  generateGraphInsights,
} from '../graph-analytics';
import type { GraphAnalytics } from '../graph-analytics';

// Mock Firebase Admin
jest.mock('../firebase-admin', () => ({
  getFirestoreAdmin: jest.fn(() => ({
    collection: jest.fn(() => ({
      where: jest.fn(() => ({
        orderBy: jest.fn(() => ({
          limit: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ docs: [] })),
          })),
        })),
        get: jest.fn(() => Promise.resolve({ docs: [] })),
      })),
      get: jest.fn(() => Promise.resolve({ docs: [] })),
    })),
  })),
}));

jest.mock('../knowledge-graph', () => ({
  getKnowledgeGraphSnapshot: jest.fn(() => Promise.resolve({
    nodes: [],
    edges: [],
  })),
}));

describe('Graph Analytics', () => {
  describe('calculateGraphHealth', () => {
    it('should calculate health score correctly for healthy graph', () => {
      const analytics: GraphAnalytics = {
        totalNodes: 100,
        totalEdges: 200,
        nodeTypes: { concept: 80, entity: 20 },
        averageEdgeWeight: 0.8,
        mostConnectedNodes: [],
        isolatedNodes: 5,
        largestComponent: 95,
        density: 0.4,
        clusteringCoefficient: 0.6,
        timestamp: new Date(),
      };

      const health = calculateGraphHealth(analytics);
      expect(health).toBeGreaterThan(70);
      expect(health).toBeLessThanOrEqual(100);
    });

    it('should calculate lower health for sparse graph', () => {
      const analytics: GraphAnalytics = {
        totalNodes: 10,
        totalEdges: 5,
        nodeTypes: { concept: 10 },
        averageEdgeWeight: 0.5,
        mostConnectedNodes: [],
        isolatedNodes: 5,
        largestComponent: 5,
        density: 0.1,
        clusteringCoefficient: 0.2,
        timestamp: new Date(),
      };

      const health = calculateGraphHealth(analytics);
      expect(health).toBeLessThan(50);
    });
  });

  describe('analyzeKnowledgeGraph', () => {
    it('should return analytics structure', async () => {
      const analytics = await analyzeKnowledgeGraph('test-user');
      expect(analytics).toHaveProperty('totalNodes');
      expect(analytics).toHaveProperty('totalEdges');
      expect(analytics).toHaveProperty('nodeTypes');
      expect(analytics).toHaveProperty('density');
      expect(analytics).toHaveProperty('clusteringCoefficient');
    });
  });

  describe('generateGraphInsights', () => {
    it('should generate insights array', async () => {
      const insights = await generateGraphInsights('test-user');
      expect(Array.isArray(insights)).toBe(true);
    });
  });
});

