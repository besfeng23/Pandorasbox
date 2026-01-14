import { NextRequest, NextResponse } from 'next/server';
import { runReasoningLane } from '@/ai/flows/run-reasoning-lane';
import { runPlannerLane } from '@/ai/flows/run-planner-lane';

// Prevent this route from being statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// CORS headers helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

// Validate API key
function validateApiKey(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('x-api-key');
  const expectedKey = process.env.MCP_API_KEY?.trim() || process.env.CHATGPT_API_KEY?.trim();
  
  if (!expectedKey) {
    console.warn('MCP_API_KEY or CHATGPT_API_KEY not configured');
    return false;
  }
  
  return apiKey === expectedKey;
}

/**
 * POST /api/mcp/runFlow
 * 
 * Executes agentic flows (reasoning or planning)
 * 
 * Request body:
 * {
 *   "flow": "reason" | "plan",
 *   "input": {
 *     "query" | "goal": string,
 *     "userEmail"?: string,
 *     "userId"?: string,
 *     "context"?: string
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid API key.' },
        { status: 401, headers: corsHeaders() }
      );
    }

    const body = await request.json();
    const { flow, input } = body;

    if (!flow || !input) {
      return NextResponse.json(
        { error: 'Missing required fields: flow and input' },
        { status: 400, headers: corsHeaders() }
      );
    }

    let result;

    try {
      switch (flow) {
        case 'reason':
        case 'reasoning':
          if (!input.query) {
            return NextResponse.json(
              { error: 'Missing required field: input.query' },
              { status: 400, headers: corsHeaders() }
            );
          }
          result = await runReasoningLane({
            query: input.query,
            userEmail: input.userEmail,
            userId: input.userId,
          });
          break;

        case 'plan':
        case 'planner':
          if (!input.goal) {
            return NextResponse.json(
              { error: 'Missing required field: input.goal' },
              { status: 400, headers: corsHeaders() }
            );
          }
          result = await runPlannerLane({
            goal: input.goal,
            userEmail: input.userEmail,
            userId: input.userId,
            context: input.context,
          });
          break;

        default:
          return NextResponse.json(
            { error: `Unknown flow type: ${flow}. Supported flows: "reason", "plan"` },
            { status: 400, headers: corsHeaders() }
          );
      }

      return NextResponse.json(
        {
          success: true,
          flow,
          result,
        },
        { headers: corsHeaders() }
      );
    } catch (error: any) {
      console.error(`Error executing flow ${flow}:`, error);
      return NextResponse.json(
        {
          success: false,
          error: 'Flow execution failed',
          details: error.message,
        },
        { status: 500, headers: corsHeaders() }
      );
    }
  } catch (error: any) {
    console.error('Error in runFlow endpoint:', error);
    return NextResponse.json(
      { error: 'Invalid request', details: error.message },
      { status: 400, headers: corsHeaders() }
    );
  }
}

/**
 * GET /api/mcp/runFlow (for testing)
 */
export async function GET(request: NextRequest) {
  return NextResponse.json(
    {
      message: 'Use POST to execute flows',
      supportedFlows: ['reason', 'plan'],
      example: {
        flow: 'reason',
        input: {
          query: 'test query',
          userEmail: process.env.DEFAULT_CHATGPT_USER_EMAIL || 'user@example.com',
        },
      },
    },
    { headers: corsHeaders() }
  );
}

