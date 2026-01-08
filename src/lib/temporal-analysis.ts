/**
 * Phase 5: Temporal Analysis
 * 
 * Tracks and analyzes knowledge graph evolution over time
 */

import {
  TemporalSnapshot,
  GraphAnalytics,
  getTemporalSnapshots,
  saveTemporalSnapshot,
  analyzeKnowledgeGraph,
} from './graph-analytics';

export interface TemporalTrend {
  metric: string;
  values: Array<{ timestamp: Date; value: number }>;
  trend: 'increasing' | 'decreasing' | 'stable';
  changePercent: number;
}

export interface KnowledgeEvolution {
  period: string; // e.g., '7d', '30d'
  nodeGrowth: number;
  edgeGrowth: number;
  newConnections: number;
  densityChange: number;
  healthScoreChange: number;
}

/**
 * Analyzes temporal trends in the graph
 */
export async function analyzeTemporalTrends(
  userId: string,
  days: number = 7
): Promise<TemporalTrend[]> {
  const snapshots = await getTemporalSnapshots(userId, days * 4); // Assume ~4 snapshots per day

  if (snapshots.length < 2) {
    return [];
  }

  const trends: TemporalTrend[] = [];

  // Node count trend
  const nodeValues = snapshots.map((s) => ({
    timestamp: s.timestamp,
    value: s.analytics.totalNodes,
  }));

  if (nodeValues.length >= 2) {
    const first = nodeValues[0].value;
    const last = nodeValues[nodeValues.length - 1].value;
    const change = last - first;
    const changePercent = first > 0 ? (change / first) * 100 : 0;

    trends.push({
      metric: 'Nodes',
      values: nodeValues,
      trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
      changePercent,
    });
  }

  // Edge count trend
  const edgeValues = snapshots.map((s) => ({
    timestamp: s.timestamp,
    value: s.analytics.totalEdges,
  }));

  if (edgeValues.length >= 2) {
    const first = edgeValues[0].value;
    const last = edgeValues[edgeValues.length - 1].value;
    const change = last - first;
    const changePercent = first > 0 ? (change / first) * 100 : 0;

    trends.push({
      metric: 'Edges',
      values: edgeValues,
      trend: change > 0 ? 'increasing' : change < 0 ? 'decreasing' : 'stable',
      changePercent,
    });
  }

  // Density trend
  const densityValues = snapshots.map((s) => ({
    timestamp: s.timestamp,
    value: s.analytics.density,
  }));

  if (densityValues.length >= 2) {
    const first = densityValues[0].value;
    const last = densityValues[densityValues.length - 1].value;
    const change = last - first;
    const changePercent = first > 0 ? (change / first) * 100 : 0;

    trends.push({
      metric: 'Density',
      values: densityValues,
      trend: change > 0.01 ? 'increasing' : change < -0.01 ? 'decreasing' : 'stable',
      changePercent,
    });
  }

  return trends;
}

/**
 * Calculates knowledge evolution metrics
 */
export async function calculateKnowledgeEvolution(
  userId: string,
  periodDays: number = 30
): Promise<KnowledgeEvolution> {
  const snapshots = await getTemporalSnapshots(userId, periodDays * 4);
  const current = await analyzeKnowledgeGraph(userId);

  if (snapshots.length === 0) {
    return {
      period: `${periodDays}d`,
      nodeGrowth: 0,
      edgeGrowth: 0,
      newConnections: 0,
      densityChange: 0,
      healthScoreChange: 0,
    };
  }

  const oldest = snapshots[snapshots.length - 1];
  const oldestAnalytics = oldest.analytics;

  // Calculate health scores
  const { calculateGraphHealth } = await import('./graph-analytics');
  const currentHealth = calculateGraphHealth(current);
  const oldHealth = calculateGraphHealth(oldestAnalytics);

  return {
    period: `${periodDays}d`,
    nodeGrowth: current.totalNodes - oldestAnalytics.totalNodes,
    edgeGrowth: current.totalEdges - oldestAnalytics.totalEdges,
    newConnections: current.totalEdges - oldestAnalytics.totalEdges,
    densityChange: current.density - oldestAnalytics.density,
    healthScoreChange: currentHealth - oldHealth,
  };
}

/**
 * Captures a snapshot of the current graph state
 */
export async function captureGraphSnapshot(userId: string): Promise<string> {
  const analytics = await analyzeKnowledgeGraph(userId);
  const snapshotId = await saveTemporalSnapshot(userId, analytics);
  return snapshotId;
}

/**
 * Detects anomalies in graph growth patterns
 */
export async function detectGraphAnomalies(
  userId: string,
  threshold: number = 2
): Promise<Array<{
  type: 'rapid_growth' | 'stagnation' | 'sudden_change';
  description: string;
  severity: 'low' | 'medium' | 'high';
  timestamp: Date;
}>> {
  const snapshots = await getTemporalSnapshots(userId, 14); // Last 14 days

  if (snapshots.length < 3) {
    return [];
  }

  const anomalies: Array<{
    type: 'rapid_growth' | 'stagnation' | 'sudden_change';
    description: string;
    severity: 'low' | 'medium' | 'high';
    timestamp: Date;
  }> = [];

  // Check for rapid growth
  for (let i = 1; i < snapshots.length; i++) {
    const previous = snapshots[i];
    const current = snapshots[i - 1];

    const nodeGrowth = current.analytics.totalNodes - previous.analytics.totalNodes;
    const avgGrowth =
      (current.analytics.totalNodes - snapshots[snapshots.length - 1].analytics.totalNodes) /
      snapshots.length;

    if (nodeGrowth > avgGrowth * threshold && nodeGrowth > 10) {
      anomalies.push({
        type: 'rapid_growth',
        description: `Rapid growth detected: ${nodeGrowth} new nodes added`,
        severity: nodeGrowth > 50 ? 'high' : 'medium',
        timestamp: current.timestamp,
      });
    }
  }

  // Check for stagnation
  if (snapshots.length >= 7) {
    const recent = snapshots.slice(0, 7);
    const avgRecentGrowth =
      (recent[0].analytics.totalNodes - recent[recent.length - 1].analytics.totalNodes) / 7;

    if (avgRecentGrowth < 1) {
      anomalies.push({
        type: 'stagnation',
        description: 'Graph growth has slowed significantly',
        severity: 'low',
        timestamp: recent[0].timestamp,
      });
    }
  }

  return anomalies;
}

