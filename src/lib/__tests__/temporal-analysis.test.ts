/**
 * Phase 5: Temporal Analysis Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  analyzeTemporalTrends,
  calculateKnowledgeEvolution,
  detectGraphAnomalies,
} from '../temporal-analysis';

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
      })),
      doc: jest.fn(() => ({
        set: jest.fn(() => Promise.resolve()),
      })),
    })),
  })),
}));

jest.mock('../graph-analytics', () => ({
  getTemporalSnapshots: jest.fn(() => Promise.resolve([])),
  analyzeKnowledgeGraph: jest.fn(() => Promise.resolve({
    totalNodes: 50,
    totalEdges: 100,
    nodeTypes: {},
    averageEdgeWeight: 0.5,
    mostConnectedNodes: [],
    isolatedNodes: 5,
    largestComponent: 45,
    density: 0.2,
    clusteringCoefficient: 0.4,
    timestamp: new Date(),
  })),
  saveTemporalSnapshot: jest.fn(() => Promise.resolve('snapshot-id')),
  calculateGraphHealth: jest.fn(() => 75),
}));

describe('Temporal Analysis', () => {
  describe('analyzeTemporalTrends', () => {
    it('should return trends array', async () => {
      const trends = await analyzeTemporalTrends('test-user', 7);
      expect(Array.isArray(trends)).toBe(true);
    });
  });

  describe('calculateKnowledgeEvolution', () => {
    it('should return evolution metrics', async () => {
      const evolution = await calculateKnowledgeEvolution('test-user', 30);
      expect(evolution).toHaveProperty('period');
      expect(evolution).toHaveProperty('nodeGrowth');
      expect(evolution).toHaveProperty('edgeGrowth');
      expect(evolution).toHaveProperty('densityChange');
      expect(evolution).toHaveProperty('healthScoreChange');
    });
  });

  describe('detectGraphAnomalies', () => {
    it('should return anomalies array', async () => {
      const anomalies = await detectGraphAnomalies('test-user');
      expect(Array.isArray(anomalies)).toBe(true);
    });
  });
});

