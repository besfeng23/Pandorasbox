/**
 * Phase 5: Graph Analytics API Routes
 * 
 * Provides REST API endpoints for graph analytics and insights
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebase-admin';
import {
  analyzeKnowledgeGraph,
  generateGraphInsights,
  calculateGraphHealth,
  suggestPotentialConnections,
} from '@/lib/graph-analytics';
import {
  analyzeTemporalTrends,
  calculateKnowledgeEvolution,
  captureGraphSnapshot,
  detectGraphAnomalies,
} from '@/lib/temporal-analysis';
import {
  recommendExploration,
  recommendConnections,
  recommendTopics,
  recommendSimilarNodes,
  recommendNextSteps,
} from '@/lib/graph-recommendations';

export const runtime = 'nodejs';

/**
 * GET /api/system/graph-analytics
 * Query parameters:
 * - action: 'analyze' | 'insights' | 'health' | 'trends' | 'evolution' | 'snapshot' | 'anomalies' | 'recommendations'
 * - userId?: string (required for some actions)
 * - days?: number
 * - nodeId?: string (for recommendations)
 */
export async function GET(request: NextRequest) {
  try {
    // Get user ID from auth token or query param
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    const searchParams = request.nextUrl.searchParams;

    let userId: string | null = null;

    if (token) {
      try {
        const authAdmin = getAuthAdmin();
        const decodedToken = await authAdmin.verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (error) {
        // Fallback to query param
        userId = searchParams.get('userId');
      }
    } else {
      userId = searchParams.get('userId');
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - userId required' }, { status: 401 });
    }

    const action = searchParams.get('action') || 'analyze';

    switch (action) {
      case 'analyze': {
        const limit = parseInt(searchParams.get('limit') || '200', 10);
        const analytics = await analyzeKnowledgeGraph(userId, limit);
        const health = calculateGraphHealth(analytics);
        return NextResponse.json({ success: true, analytics, health });
      }

      case 'insights': {
        const insights = await generateGraphInsights(userId);
        return NextResponse.json({ success: true, insights });
      }

      case 'health': {
        const analytics = await analyzeKnowledgeGraph(userId);
        const health = calculateGraphHealth(analytics);
        return NextResponse.json({ success: true, health, analytics });
      }

      case 'trends': {
        const days = parseInt(searchParams.get('days') || '7', 10);
        const trends = await analyzeTemporalTrends(userId, days);
        return NextResponse.json({ success: true, trends });
      }

      case 'evolution': {
        const days = parseInt(searchParams.get('days') || '30', 10);
        const evolution = await calculateKnowledgeEvolution(userId, days);
        return NextResponse.json({ success: true, evolution });
      }

      case 'anomalies': {
        const threshold = parseFloat(searchParams.get('threshold') || '2', 10);
        const anomalies = await detectGraphAnomalies(userId, threshold);
        return NextResponse.json({ success: true, anomalies });
      }

      case 'recommendations': {
        const type = searchParams.get('type') || 'exploration';
        const limit = parseInt(searchParams.get('limit') || '5', 10);

        switch (type) {
          case 'exploration': {
            const recommendations = await recommendExploration(userId, limit);
            return NextResponse.json({ success: true, recommendations });
          }

          case 'connections': {
            const recommendations = await recommendConnections(userId, limit);
            return NextResponse.json({ success: true, recommendations });
          }

          case 'topics': {
            const recommendations = await recommendTopics(userId, limit);
            return NextResponse.json({ success: true, recommendations });
          }

          case 'similar': {
            const nodeId = searchParams.get('nodeId');
            if (!nodeId) {
              return NextResponse.json(
                { error: 'nodeId required for similar recommendations' },
                { status: 400 }
              );
            }
            const recommendations = await recommendSimilarNodes(userId, nodeId, limit);
            return NextResponse.json({ success: true, recommendations });
          }

          case 'next-steps': {
            const currentNodeIds = searchParams.get('nodeIds')?.split(',');
            const recommendations = await recommendNextSteps(userId, currentNodeIds, limit);
            return NextResponse.json({ success: true, recommendations });
          }

          default:
            return NextResponse.json({ error: `Unknown recommendation type: ${type}` }, { status: 400 });
        }
      }

      case 'potential-connections': {
        const limit = parseInt(searchParams.get('limit') || '5', 10);
        const recommendations = await suggestPotentialConnections(userId, limit);
        return NextResponse.json({ success: true, recommendations });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in graph analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/system/graph-analytics
 * Body:
 * - action: 'capture-snapshot'
 * - userId: string
 */
export async function POST(request: NextRequest) {
  try {
    // Get user ID from auth token or body
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');

    let userId: string | null = null;

    if (token) {
      try {
        const authAdmin = getAuthAdmin();
        const decodedToken = await authAdmin.verifyIdToken(token);
        userId = decodedToken.uid;
      } catch (error) {
        // Fallback to body
      }
    }

    const body = await request.json();

    if (!userId) {
      userId = body.userId;
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized - userId required' }, { status: 401 });
    }

    const { action } = body;

    switch (action) {
      case 'capture-snapshot': {
        const snapshotId = await captureGraphSnapshot(userId);
        return NextResponse.json({ success: true, snapshotId });
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error in graph analytics API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

