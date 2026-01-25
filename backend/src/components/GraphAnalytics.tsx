/**
 * Phase 5: Graph Analytics Dashboard Component
 * 
 * Visualizes graph analytics, insights, and recommendations
 */

'use client';

import React, { useEffect, useState } from 'react';
import { GraphAnalytics as GraphAnalyticsType, GraphInsight, GraphRecommendation } from '@/lib/graph-analytics';
import { TemporalTrend, KnowledgeEvolution } from '@/lib/temporal-analysis';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Loader2, TrendingUp, TrendingDown, Minus, Activity, Lightbulb, Target, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from './ui/progress';

interface GraphAnalyticsProps {
  userId: string;
  onNodeClick?: (nodeId: string) => void;
}

export function GraphAnalytics({ userId, onNodeClick }: GraphAnalyticsProps) {
  const [analytics, setAnalytics] = useState<GraphAnalyticsType | null>(null);
  const [insights, setInsights] = useState<GraphInsight[]>([]);
  const [recommendations, setRecommendations] = useState<GraphRecommendation[]>([]);
  const [trends, setTrends] = useState<TemporalTrend[]>([]);
  const [evolution, setEvolution] = useState<KnowledgeEvolution | null>(null);
  const [health, setHealth] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Fetch all analytics data in parallel
      const [analyticsRes, insightsRes, recommendationsRes, trendsRes, evolutionRes] = await Promise.all([
        fetch(`/api/system/graph-analytics?action=analyze&userId=${userId}`),
        fetch(`/api/system/graph-analytics?action=insights&userId=${userId}`),
        fetch(`/api/system/graph-analytics?action=recommendations&type=exploration&userId=${userId}&limit=5`),
        fetch(`/api/system/graph-analytics?action=trends&userId=${userId}&days=7`),
        fetch(`/api/system/graph-analytics?action=evolution&userId=${userId}&days=30`),
      ]);

      const [analyticsData, insightsData, recommendationsData, trendsData, evolutionData] = await Promise.all([
        analyticsRes.json(),
        insightsRes.json(),
        recommendationsRes.json(),
        trendsRes.json(),
        evolutionRes.json(),
      ]);

      if (analyticsData.success) {
        setAnalytics(analyticsData.analytics);
        setHealth(analyticsData.health);
      }

      if (insightsData.success) {
        setInsights(insightsData.insights);
      }

      if (recommendationsData.success) {
        setRecommendations(recommendationsData.recommendations);
      }

      if (trendsData.success) {
        setTrends(trendsData.trends);
      }

      if (evolutionData.success) {
        setEvolution(evolutionData.evolution);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [userId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="p-8 text-center text-gray-400">
        <p>No analytics data available</p>
        <Button onClick={fetchAnalytics} variant="outline" className="mt-4">
          Refresh
        </Button>
      </div>
    );
  }

  const getHealthColor = (health: number) => {
    if (health >= 70) return 'text-green-400';
    if (health >= 40) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-red-400" />;
      default:
        return <Minus className="h-4 w-4 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Graph Analytics</h2>
          <p className="text-sm text-gray-400 mt-1">Knowledge graph insights and recommendations</p>
        </div>
        <Button onClick={fetchAnalytics} variant="outline" size="sm" disabled={isLoading}>
          <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
          Refresh
        </Button>
      </div>

      {/* Health Score */}
      <Card className="bg-black/40 border-white/10">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Graph Health
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">Overall Health Score</span>
              <span className={cn('text-2xl font-bold', getHealthColor(health))}>{health}</span>
            </div>
            <Progress value={health} className="h-2" />
            <p className="text-xs text-gray-400 mt-2">
              Based on node count, connectivity, density, and clustering
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Total Nodes</CardDescription>
            <CardTitle className="text-3xl text-white">{analytics.totalNodes}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1">
              {Object.entries(analytics.nodeTypes).map(([type, count]) => (
                <div key={type} className="flex justify-between text-sm">
                  <span className="text-gray-400 capitalize">{type}</span>
                  <span className="text-white">{count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Total Edges</CardDescription>
            <CardTitle className="text-3xl text-white">{analytics.totalEdges}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Avg Weight</span>
                <span className="text-white">{analytics.averageEdgeWeight.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Density</span>
                <span className="text-white">{(analytics.density * 100).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-black/40 border-white/10">
          <CardHeader className="pb-2">
            <CardDescription className="text-gray-400">Connectivity</CardDescription>
            <CardTitle className="text-3xl text-white">{analytics.largestComponent}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Isolated</span>
                <span className="text-white">{analytics.isolatedNodes}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Clustering</span>
                <span className="text-white">{(analytics.clusteringCoefficient * 100).toFixed(1)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trends */}
      {trends.length > 0 && (
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Trends (7 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {trends.map((trend) => (
                <div key={trend.metric} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white">{trend.metric}</span>
                    <div className="flex items-center gap-2">
                      {getTrendIcon(trend.trend)}
                      <span
                        className={cn(
                          'text-sm',
                          trend.trend === 'increasing' ? 'text-green-400' : 'text-gray-400'
                        )}
                      >
                        {trend.changePercent > 0 ? '+' : ''}
                        {trend.changePercent.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="h-1 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full transition-all',
                        trend.trend === 'increasing' ? 'bg-green-400' : 'bg-gray-600'
                      )}
                      style={{ width: `${Math.min(100, Math.abs(trend.changePercent) * 10)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evolution */}
      {evolution && (
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Knowledge Evolution (30 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <div className="text-xs text-gray-400">Node Growth</div>
                <div className="text-lg font-semibold text-white">
                  {evolution.nodeGrowth > 0 ? '+' : ''}
                  {evolution.nodeGrowth}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Edge Growth</div>
                <div className="text-lg font-semibold text-white">
                  {evolution.edgeGrowth > 0 ? '+' : ''}
                  {evolution.edgeGrowth}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Density Change</div>
                <div className="text-lg font-semibold text-white">
                  {evolution.densityChange > 0 ? '+' : ''}
                  {evolution.densityChange.toFixed(3)}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400">Health Change</div>
                <div className={cn('text-lg font-semibold', evolution.healthScoreChange > 0 ? 'text-green-400' : 'text-red-400')}>
                  {evolution.healthScoreChange > 0 ? '+' : ''}
                  {evolution.healthScoreChange}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Insights */}
      {insights.length > 0 && (
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Lightbulb className="h-5 w-5" />
              Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={cn(
                    'p-3 rounded-lg border',
                    insight.severity === 'high'
                      ? 'bg-red-500/10 border-red-500/30'
                      : insight.severity === 'medium'
                      ? 'bg-yellow-500/10 border-yellow-500/30'
                      : 'bg-blue-500/10 border-blue-500/30'
                  )}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">
                          {insight.type}
                        </Badge>
                        <span className="text-sm font-semibold text-white">{insight.title}</span>
                      </div>
                      <p className="text-sm text-gray-300">{insight.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Target className="h-5 w-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.map((rec) => (
                <div
                  key={rec.nodeId}
                  className="p-3 rounded-lg border border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold text-white">{rec.label}</span>
                        <Badge variant="outline" className="text-xs">
                          {(rec.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-300 mb-2">{rec.reason}</p>
                      {rec.suggestedActions && rec.suggestedActions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2">
                          {rec.suggestedActions.map((action, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {action}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    {onNodeClick && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => onNodeClick(rec.nodeId)}
                        className="ml-2"
                      >
                        Explore
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Most Connected Nodes */}
      {analytics.mostConnectedNodes.length > 0 && (
        <Card className="bg-black/40 border-white/10">
          <CardHeader>
            <CardTitle className="text-white">Knowledge Hubs</CardTitle>
            <CardDescription className="text-gray-400">Most connected nodes in your graph</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {analytics.mostConnectedNodes.slice(0, 5).map((node, idx) => (
                <div
                  key={node.nodeId}
                  className="flex items-center justify-between p-2 rounded border border-white/5 hover:border-white/10 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-4">#{idx + 1}</span>
                    <span className="text-sm text-white">{node.label}</span>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {node.connections} connections
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

