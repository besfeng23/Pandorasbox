/**
 * Phase 5: Advanced Graph Analytics & Temporal Insights
 * 
 * Provides analytics, insights, and temporal analysis of the knowledge graph
 */

import { getFirestoreAdmin } from './firebase-admin';
import { FieldValue, Timestamp } from 'firebase-admin/firestore';
import {
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
  KnowledgeGraphSnapshot,
  getKnowledgeGraphSnapshot,
} from './knowledge-graph';

export interface GraphAnalytics {
  totalNodes: number;
  totalEdges: number;
  nodeTypes: Record<string, number>;
  averageEdgeWeight: number;
  mostConnectedNodes: Array<{ nodeId: string; label: string; connections: number }>;
  isolatedNodes: number;
  largestComponent: number;
  density: number; // Graph density (edges / possible edges)
  clusteringCoefficient: number;
  timestamp: Date;
}

export interface TemporalSnapshot {
  id: string;
  userId: string;
  timestamp: Date;
  analytics: GraphAnalytics;
  nodeIds: string[];
  edgeIds: string[];
}

export interface GraphInsight {
  id: string;
  userId: string;
  type: 'trend' | 'pattern' | 'anomaly' | 'recommendation';
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high';
  relatedNodeIds?: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface GraphRecommendation {
  nodeId: string;
  label: string;
  reason: string;
  confidence: number;
  action?: 'explore' | 'connect' | 'investigate';
  relatedNodes?: string[];
}

/**
 * Analyzes the current state of the knowledge graph
 */
export async function analyzeKnowledgeGraph(
  userId: string,
  limit?: number
): Promise<GraphAnalytics> {
  const snapshot = await getKnowledgeGraphSnapshot({ userId, limit });

  const nodes = snapshot.nodes;
  const edges = snapshot.edges;

  // Count nodes by type
  const nodeTypes: Record<string, number> = {};
  nodes.forEach((node) => {
    nodeTypes[node.type] = (nodeTypes[node.type] || 0) + 1;
  });

  // Calculate average edge weight
  const totalWeight = edges.reduce((sum, edge) => sum + edge.weight, 0);
  const averageEdgeWeight = edges.length > 0 ? totalWeight / edges.length : 0;

  // Count connections per node
  const connectionCounts = new Map<string, number>();
  edges.forEach((edge) => {
    connectionCounts.set(edge.sourceId, (connectionCounts.get(edge.sourceId) || 0) + 1);
    connectionCounts.set(edge.targetId, (connectionCounts.get(edge.targetId) || 0) + 1);
  });

  const mostConnectedNodes = Array.from(connectionCounts.entries())
    .map(([nodeId, connections]) => {
      const node = nodes.find((n) => n.id === nodeId);
      return {
        nodeId,
        label: node?.label || 'Unknown',
        connections,
      };
    })
    .sort((a, b) => b.connections - a.connections)
    .slice(0, 10);

  // Count isolated nodes (nodes with no edges)
  const connectedNodeIds = new Set<string>();
  edges.forEach((edge) => {
    connectedNodeIds.add(edge.sourceId);
    connectedNodeIds.add(edge.targetId);
  });
  const isolatedNodes = nodes.filter((node) => !connectedNodeIds.has(node.id)).length;

  // Calculate graph density
  const possibleEdges = (nodes.length * (nodes.length - 1)) / 2;
  const density = possibleEdges > 0 ? edges.length / possibleEdges : 0;

  // Calculate clustering coefficient (simplified - average local clustering)
  let totalClustering = 0;
  let nodesWithNeighbors = 0;

  for (const node of nodes) {
    const neighbors = new Set<string>();
    edges.forEach((edge) => {
      if (edge.sourceId === node.id) neighbors.add(edge.targetId);
      if (edge.targetId === node.id) neighbors.add(edge.sourceId);
    });

    if (neighbors.size < 2) continue;

    nodesWithNeighbors++;
    let neighborConnections = 0;
    const neighborArray = Array.from(neighbors);

    for (let i = 0; i < neighborArray.length; i++) {
      for (let j = i + 1; j < neighborArray.length; j++) {
        const hasEdge = edges.some(
          (e) =>
            (e.sourceId === neighborArray[i] && e.targetId === neighborArray[j]) ||
            (e.sourceId === neighborArray[j] && e.targetId === neighborArray[i])
        );
        if (hasEdge) neighborConnections++;
      }
    }

    const possibleNeighborEdges = (neighbors.size * (neighbors.size - 1)) / 2;
    const localClustering =
      possibleNeighborEdges > 0 ? neighborConnections / possibleNeighborEdges : 0;
    totalClustering += localClustering;
  }

  const clusteringCoefficient =
    nodesWithNeighbors > 0 ? totalClustering / nodesWithNeighbors : 0;

  // Find largest connected component (simplified BFS)
  const visited = new Set<string>();
  let largestComponent = 0;

  for (const node of nodes) {
    if (visited.has(node.id)) continue;

    const component = new Set<string>();
    const queue = [node.id];

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;

      visited.add(currentId);
      component.add(currentId);

      edges.forEach((edge) => {
        if (edge.sourceId === currentId && !visited.has(edge.targetId)) {
          queue.push(edge.targetId);
        }
        if (edge.targetId === currentId && !visited.has(edge.sourceId)) {
          queue.push(edge.sourceId);
        }
      });
    }

    largestComponent = Math.max(largestComponent, component.size);
  }

  return {
    totalNodes: nodes.length,
    totalEdges: edges.length,
    nodeTypes,
    averageEdgeWeight,
    mostConnectedNodes,
    isolatedNodes,
    largestComponent,
    density,
    clusteringCoefficient,
    timestamp: new Date(),
  };
}

/**
 * Saves a temporal snapshot of the graph state
 */
export async function saveTemporalSnapshot(
  userId: string,
  analytics: GraphAnalytics
): Promise<string> {
  const firestoreAdmin = getFirestoreAdmin();
  const snapshotRef = firestoreAdmin.collection('graph_analytics').doc();

  const snapshot: Omit<TemporalSnapshot, 'id'> = {
    userId,
    timestamp: analytics.timestamp,
    analytics,
    nodeIds: [],
    edgeIds: [],
  };

  await snapshotRef.set({
    ...snapshot,
    id: snapshotRef.id,
    createdAt: FieldValue.serverTimestamp(),
  });

  return snapshotRef.id;
}

/**
 * Gets temporal snapshots for analysis
 */
export async function getTemporalSnapshots(
  userId: string,
  limit: number = 30
): Promise<TemporalSnapshot[]> {
  const firestoreAdmin = getFirestoreAdmin();
  const snapshot = await firestoreAdmin
    .collection('graph_analytics')
    .where('userId', '==', userId)
    .orderBy('timestamp', 'desc')
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    ...doc.data(),
    id: doc.id,
  })) as TemporalSnapshot[];
}

/**
 * Generates insights from graph analysis
 */
export async function generateGraphInsights(
  userId: string
): Promise<GraphInsight[]> {
  const currentAnalytics = await analyzeKnowledgeGraph(userId);
  const snapshots = await getTemporalSnapshots(userId, 7); // Last 7 snapshots

  const insights: GraphInsight[] = [];

  // Growth trend insight
  if (snapshots.length >= 2) {
    const previous = snapshots[snapshots.length - 1]?.analytics;
    if (previous) {
      const nodeGrowth = currentAnalytics.totalNodes - previous.totalNodes;
      const edgeGrowth = currentAnalytics.totalEdges - previous.totalEdges;

      if (nodeGrowth > 10) {
        insights.push({
          id: `growth-${Date.now()}`,
          userId,
          type: 'trend',
          title: 'Rapid Knowledge Growth',
          description: `Your knowledge graph grew by ${nodeGrowth} nodes and ${edgeGrowth} edges.`,
          severity: nodeGrowth > 50 ? 'high' : 'medium',
          createdAt: new Date(),
        });
      }
    }
  }

  // Density insight
  if (currentAnalytics.density < 0.1 && currentAnalytics.totalNodes > 20) {
    insights.push({
      id: `density-${Date.now()}`,
      userId,
      type: 'pattern',
      title: 'Sparse Knowledge Graph',
      description: `Your graph has low density (${(currentAnalytics.density * 100).toFixed(1)}%). Consider exploring connections between topics.`,
      severity: 'low',
      createdAt: new Date(),
    });
  }

  // Isolated nodes insight
  if (currentAnalytics.isolatedNodes > 5) {
    insights.push({
      id: `isolated-${Date.now()}`,
      userId,
      type: 'recommendation',
      title: 'Isolated Knowledge Nodes',
      description: `You have ${currentAnalytics.isolatedNodes} unconnected nodes. Try linking related concepts together.`,
      severity: 'low',
      createdAt: new Date(),
    });
  }

  // High clustering insight
  if (currentAnalytics.clusteringCoefficient > 0.5) {
    insights.push({
      id: `clustering-${Date.now()}`,
      userId,
      type: 'pattern',
      title: 'Highly Clustered Knowledge',
      description: `Your knowledge graph shows strong clustering (${(currentAnalytics.clusteringCoefficient * 100).toFixed(1)}%), indicating well-connected topic areas.`,
      severity: 'low',
      createdAt: new Date(),
    });
  }

  // Most connected nodes recommendation
  if (currentAnalytics.mostConnectedNodes.length > 0) {
    const topNode = currentAnalytics.mostConnectedNodes[0];
    insights.push({
      id: `hub-${Date.now()}`,
      userId,
      type: 'pattern',
      title: 'Knowledge Hub Identified',
      description: `"${topNode.label}" is your most connected concept with ${topNode.connections} connections. Consider exploring related topics.`,
      severity: 'low',
      relatedNodeIds: [topNode.nodeId],
      createdAt: new Date(),
    });
  }

  return insights;
}

/**
 * Gets graph health score (0-100)
 */
export function calculateGraphHealth(analytics: GraphAnalytics): number {
  let score = 0;

  // Node count (max 30 points)
  if (analytics.totalNodes > 50) score += 30;
  else if (analytics.totalNodes > 20) score += 20;
  else if (analytics.totalNodes > 10) score += 10;

  // Edge count (max 30 points)
  if (analytics.totalEdges > 100) score += 30;
  else if (analytics.totalEdges > 50) score += 20;
  else if (analytics.totalEdges > 20) score += 10;

  // Density (max 20 points)
  if (analytics.density > 0.3) score += 20;
  else if (analytics.density > 0.1) score += 10;

  // Connectedness (max 20 points - inverse of isolated nodes percentage)
  const isolationRate = analytics.totalNodes > 0 ? analytics.isolatedNodes / analytics.totalNodes : 1;
  score += (1 - isolationRate) * 20;

  return Math.min(100, Math.round(score));
}

/**
 * Identifies potential connections between isolated nodes
 */
export async function suggestPotentialConnections(
  userId: string,
  limit: number = 5
): Promise<GraphRecommendation[]> {
  const snapshot = await getKnowledgeGraphSnapshot({ userId });
  const nodes = snapshot.nodes;
  const edges = snapshot.edges;

  const connectedNodeIds = new Set<string>();
  edges.forEach((edge) => {
    connectedNodeIds.add(edge.sourceId);
    connectedNodeIds.add(edge.targetId);
  });

  const isolatedNodes = nodes.filter((node) => !connectedNodeIds.has(node.id));

  // For each isolated node, find the closest connected node (simplified - using label similarity)
  const recommendations: GraphRecommendation[] = [];

  for (const isolatedNode of isolatedNodes.slice(0, limit)) {
    // Find a node with similar label (simple string matching)
    const similarNode = nodes.find(
      (n) =>
        n.id !== isolatedNode.id &&
        connectedNodeIds.has(n.id) &&
        (isolatedNode.label.toLowerCase().includes(n.label.toLowerCase().substring(0, 3)) ||
          n.label.toLowerCase().includes(isolatedNode.label.toLowerCase().substring(0, 3)))
    );

    if (similarNode) {
      recommendations.push({
        nodeId: isolatedNode.id,
        label: isolatedNode.label,
        reason: `Similar to connected node "${similarNode.label}"`,
        confidence: 0.6,
        action: 'connect',
        relatedNodes: [similarNode.id],
      });
    }
  }

  return recommendations;
}

