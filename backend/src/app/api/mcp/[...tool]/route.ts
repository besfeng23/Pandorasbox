import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, handleOptions } from '@/lib/cors';
import { handleSearchKnowledgeBase } from '@/mcp/tools/search-knowledge';
import { handleAddMemory } from '@/mcp/tools/add-memory';
import { handleGenerateArtifact } from '@/mcp/tools/generate-artifact';
import { adminDb } from '@/firebase/admin';

// Prevent this route from being statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * HTTP Bridge for MCP Tools
 * 
 * This endpoint provides HTTP access to MCP tools for ChatGPT Actions compatibility.
 * ChatGPT uses OpenAPI (Swagger) for Actions, so this bridge converts HTTP requests
 * to MCP tool calls.
 * 
 * Endpoints:
 *   POST /api/mcp/search_knowledge_base
 *   POST /api/mcp/add_memory
 *   POST /api/mcp/generate_artifact
 */

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

// Validate API key
async function validateApiKey(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  const apiKey = authHeader?.replace('Bearer ', '') || request.headers.get('x-api-key');

  if (!apiKey) {
    return false;
  }

  const keysSnapshot = await adminDb
    .collection('api_clients')
    .where('apiKey', '==', apiKey)
    .limit(1)
    .get();

  return !keysSnapshot.empty;
}

// Main handler
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tool: string[] }> }
) {
  try {
    // Validate API key
    if (!(await validateApiKey(request))) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid API key.' },
        { status: 401, headers: corsHeaders(request) }
      );
    }

    // Await params (Next.js 15+)
    const { tool } = await params;
    
    // Get tool name from route
    const toolName = tool?.[0];
    
    if (!toolName) {
      return NextResponse.json(
        { error: 'Tool name is required in the URL path' },
        { status: 400, headers: corsHeaders(request) }
      );
    }

    // Parse request body
    const body = await request.json();

    // Route to appropriate tool handler
    let result: any;

    switch (toolName) {
      case 'search_knowledge_base': {
        if (!body.query || !body.user_email) {
          return NextResponse.json(
            { error: 'Missing required parameters: query, user_email' },
            { status: 400, headers: corsHeaders(request) }
          );
        }
        result = await handleSearchKnowledgeBase({
          query: body.query,
          user_email: body.user_email,
          limit: body.limit,
        });
        break;
      }

      case 'add_memory': {
        if (!body.memory || !body.user_email) {
          return NextResponse.json(
            { error: 'Missing required parameters: memory, user_email' },
            { status: 400, headers: corsHeaders(request) }
          );
        }
        result = await handleAddMemory({
          memory: body.memory,
          user_email: body.user_email,
        });
        break;
      }

      case 'generate_artifact': {
        if (!body.title || !body.type || !body.content || !body.user_email) {
          return NextResponse.json(
            { error: 'Missing required parameters: title, type, content, user_email' },
            { status: 400, headers: corsHeaders(request) }
          );
        }
        result = await handleGenerateArtifact({
          title: body.title,
          type: body.type,
          content: body.content,
          user_email: body.user_email,
        });
        break;
      }

      default:
        return NextResponse.json(
          { error: `Unknown tool: ${toolName}` },
          { status: 404, headers: corsHeaders(request) }
        );
    }

    return NextResponse.json(
      {
        success: true,
        result: result,
      },
      { headers: corsHeaders(request) }
    );

  } catch (error: any) {
    const { tool } = await params;
    console.error(`Error in MCP HTTP bridge (${tool?.[0]}):`, error);
    
    // Handle known error types
    if (error.message && typeof error.message === 'string') {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400, headers: corsHeaders(request) }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500, headers: corsHeaders(request) }
    );
  }
}

