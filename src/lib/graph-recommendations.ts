/**
 * Phase 5: Graph-Based Recommendations
 * 
 * Provides intelligent recommendations based on graph structure and patterns
 */

import {
  KnowledgeGraphNode,
  KnowledgeGraphEdge,
  KnowledgeGraphSnapshot,
  getKnowledgeGraphSnapshot,
  searchKnowledgeNodes,
} from './knowledge-graph';
import { GraphAnalytics, analyzeKnowledgeGraph } from './graph-analytics';

export interface ExplorationRecommendation {
  nodeId: string;
  label: string;
  reason: string;
  confidence: number;
  suggestedActions: string[];
  relatedNodeIds?: string[];
}

export interface ConnectionRecommendation {
  sourceNodeId: string;
  targetNodeId: string;
  sourceLabel: string;
  targetLabel: string;
  reason: string;
  confidence: number;
  suggestedRelation?: string;
}

export interface TopicRecommendation {
  topic: string;
  relevance: number;
  relatedNodes: string[];
  why: string;
}

/**
 * Recommends nodes to explore based on graph structure
 */
export async function recommendExploration(
  userId: string,
  limit: number = 5
): Promise<ExplorationRecommendation[]> {
  const analytics = await analyzeKnowledgeGraph(userId);
  const snapshot = await getKnowledgeGraphSnapshot({ userId });

  const recommendations: ExplorationRecommendation[] = [];

  // Recommend highly connected nodes (hubs)
  analytics.mostConnectedNodes.slice(0, limit).forEach((node) => {
    recommendations.push({
      nodeId: node.nodeId,
      label: node.label,
      reason: `Highly connected hub with ${node.connections} connections`,
      confidence: Math.min(0.9, 0.5 + node.connections / 20),
      suggestedActions: ['Explore connected nodes', 'Deep dive into relationships'],
      relatedNodeIds: snapshot.edges
        .filter((e) => e.sourceId === node.nodeId || e.targetId === node.nodeId)
        .map((e) => (e.sourceId === node.nodeId ? e.targetId : e.sourceId)),
    });
  });

  // Recommend isolated nodes that might benefit from connections
  const connectedNodeIds = new Set<string>();
  snapshot.edges.forEach((edge) => {
    connectedNodeIds.add(edge.sourceId);
    connectedNodeIds.add(edge.targetId);
  });

  const isolatedNodes = snapshot.nodes
    .filter((node) => !connectedNodeIds.has(node.id))
    .slice(0, limit);

  isolatedNodes.forEach((node) => {
    recommendations.push({
      nodeId: node.id,
      label: node.label,
      reason: 'Isolated node - consider connecting to related concepts',
      confidence: 0.7,
      suggestedActions: ['Find related nodes', 'Create connections'],
    });
  });

  return recommendations.slice(0, limit);
}

/**
 * Recommends potential connections between nodes
 */
export async function recommendConnections(
  userId: string,
  limit: number = 5
): Promise<ConnectionRecommendation[]> {
  const snapshot = await getKnowledgeGraphSnapshot({ userId });
  const nodes = snapshot.nodes;
  const edges = snapshot.edges;

  const recommendations: ConnectionRecommendation[] = [];

  // Find nodes that are 2 hops apart (potential indirect connections)
  const adjacencyMap = new Map<string, Set<string>>();
  nodes.forEach((node) => adjacencyMap.set(node.id, new Set()));

  edges.forEach((edge) => {
    adjacencyMap.get(edge.sourceId)?.add(edge.targetId);
    adjacencyMap.get(edge.targetId)?.add(edge.sourceId);
  });

  const existingPairs = new Set<string>();
  edges.forEach((edge) => {
    const pair = [edge.sourceId, edge.targetId].sort().join('::');
    existingPairs.add(pair);
  });

  // Find 2-hop paths that could be direct connections
  for (const node of nodes) {
    const neighbors = adjacencyMap.get(node.id) || new Set();
    const secondNeighbors = new Set<string>();

    for (const neighbor of neighbors) {
      const neighborNeighbors = adjacencyMap.get(neighbor) || new Set();
      neighborNeighbors.forEach((nn) => {
        if (nn !== node.id && !neighbors.has(nn)) {
          secondNeighbors.add(nn);
        }
      });
    }

    for (const secondNeighbor of secondNeighbors) {
      const pair = [node.id, secondNeighbor].sort().join('::');
      if (!existingPairs.has(pair) && recommendations.length < limit) {
        const targetNode = nodes.find((n) => n.id === secondNeighbor);
        if (targetNode) {
          recommendations.push({
            sourceNodeId: node.id,
            targetNodeId: secondNeighbor,
            sourceLabel: node.label,
            targetLabel: targetNode.label,
            reason: `Both connected to common neighbor(s)`,
            confidence: 0.6,
            suggestedRelation: 'related_to',
          });
        }
      }
    }
  }

  return recommendations.slice(0, limit);
}

/**
 * Recommends topics to explore based on current graph state
 */
export async function recommendTopics(
  userId: string,
  limit: number = 5
): Promise<TopicRecommendation[]> {
  const analytics = await analyzeKnowledgeGraph(userId);

  const recommendations: TopicRecommendation[] = [];

  // Recommend topics based on node type distribution
  const typeCounts = Object.entries(analytics.nodeTypes).sort(
    (a, b) => b[1] - a[1]
  );

  typeCounts.slice(0, limit).forEach(([type, count]) => {
    recommendations.push({
      topic: type,
      relevance: Math.min(1.0, count / 20), // Normalize
      relatedNodes: [],
      why: `${count} ${type} nodes in your graph`,
    });
  });

  // Recommend based on most connected nodes (likely important topics)
  analytics.mostConnectedNodes.slice(0, 3).forEach((node) => {
    recommendations.push({
      topic: node.label,
      relevance: Math.min(1.0, 0.5 + node.connections / 30),
      relatedNodes: [],
      why: `Hub node with ${node.connections} connections`,
    });
  });

  return recommendations.slice(0, limit);
}

/**
 * Recommends nodes based on semantic similarity
 */
export async function recommendSimilarNodes(
  userId: string,
  nodeId: string,
  limit: number = 5
): Promise<ExplorationRecommendation[]> {
  const snapshot = await getKnowledgeGraphSnapshot({ userId });
  const sourceNode = snapshot.nodes.find((n) => n.id === nodeId);

  if (!sourceNode) {
    return [];
  }

  // Use semantic search to find similar nodes
  const similarNodes = await searchKnowledgeNodes(userId, sourceNode.label, limit + 1);

  // Filter out the source node itself
  const recommendations = similarNodes
    .filter((node) => node.id !== nodeId)
    .slice(0, limit)
    .map((node) => ({
      nodeId: node.id,
      label: node.label,
      reason: `Semantically similar to "${sourceNode.label}"`,
      confidence: 0.7,
      suggestedActions: ['Compare concepts', 'Explore differences'],
    }));

  return recommendations;
}

/**
 * Recommends next exploration steps based on current context
 */
export async function recommendNextSteps(
  userId: string,
  currentNodeIds?: string[],
  limit: number = 5
): Promise<ExplorationRecommendation[]> {
  const snapshot = await getKnowledgeGraphSnapshot({ userId });

  if (!currentNodeIds || currentNodeIds.length === 0) {
    // If no current context, recommend starting with hubs
    return recommendExploration(userId, limit);
  }

  // Find neighbors of current nodes
  const exploredNodes = new Set(currentNodeIds);
  const neighborNodes = new Set<string>();

  snapshot.edges.forEach((edge) => {
    if (exploredNodes.has(edge.sourceId) && !exploredNodes.has(edge.targetId)) {
      neighborNodes.add(edge.targetId);
    }
    if (exploredNodes.has(edge.targetId) && !exploredNodes.has(edge.sourceId)) {
      neighborNodes.add(edge.sourceId);
    }
  });

  const recommendations: ExplorationRecommendation[] = [];

  for (const neighborId of Array.from(neighborNodes).slice(0, limit)) {
    const node = snapshot.nodes.find((n) => n.id === neighborId);
    if (node) {
      // Count connections to explored nodes
      const connectionsToExplored = snapshot.edges.filter(
        (e) =>
          (e.sourceId === neighborId && exploredNodes.has(e.targetId)) ||
          (e.targetId === neighborId && exploredNodes.has(e.sourceId))
      ).length;

      recommendations.push({
        nodeId: neighborId,
        label: node.label,
        reason: `Connected to ${connectionsToExplored} of your explored nodes`,
        confidence: Math.min(0.9, 0.5 + connectionsToExplored / 5),
        suggestedActions: ['Explore this node', 'View connections'],
        relatedNodeIds: currentNodeIds,
      });
    }
  }

  return recommendations;
}

