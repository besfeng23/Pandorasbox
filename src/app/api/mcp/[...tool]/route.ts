import { NextRequest, NextResponse } from 'next/server';
import { handleSearchKnowledgeBase } from '@/mcp/tools/search-knowledge';
import { handleAddMemory } from '@/mcp/tools/add-memory';
import { handleGenerateArtifact } from '@/mcp/tools/generate-artifact';

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

// Main handler
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tool: string[] }> | { tool: string[] } }
) {
  try {
    // Validate API key
    if (!validateApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Invalid API key.' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // Await params if it's a Promise (Next.js 15+)
    const resolvedParams = params instanceof Promise ? await params : params;
    
    // Get tool name from route
    const toolName = resolvedParams.tool?.[0];
    
    if (!toolName) {
      return NextResponse.json(
        { error: 'Tool name is required in the URL path' },
        { status: 400, headers: corsHeaders() }
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
            { status: 400, headers: corsHeaders() }
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
            { status: 400, headers: corsHeaders() }
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
            { status: 400, headers: corsHeaders() }
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
          { status: 404, headers: corsHeaders() }
        );
    }

    return NextResponse.json(
      {
        success: true,
        result: result,
      },
      { headers: corsHeaders() }
    );

  } catch (error: any) {
    console.error(`Error in MCP HTTP bridge (${params.tool?.[0]}):`, error);
    
    // Handle known error types
    if (error.message && typeof error.message === 'string') {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
        },
        { status: 400, headers: corsHeaders() }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined,
      },
      { status: 500, headers: corsHeaders() }
    );
  }
}

// Support GET for tool information
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tool: string[] }> | { tool: string[] } }
) {
  // Await params if it's a Promise (Next.js 15+)
  const resolvedParams = params instanceof Promise ? await params : params;
  const toolName = resolvedParams.tool?.[0];

  if (!toolName) {
    return NextResponse.json(
      {
        message: 'Pandora\'s Box MCP HTTP Bridge',
        available_tools: [
          'search_knowledge_base',
          'add_memory',
          'generate_artifact',
        ],
        usage: 'POST /api/mcp/{tool_name} with Authorization: Bearer {API_KEY}',
      },
      { headers: corsHeaders() }
    );
  }

  // Return tool-specific information
  const toolInfo: Record<string, any> = {
    search_knowledge_base: {
      name: 'search_knowledge_base',
      description: 'Search the knowledge base using semantic search',
      method: 'POST',
      required_params: ['query', 'user_email'],
      optional_params: ['limit'],
    },
    add_memory: {
      name: 'add_memory',
      description: 'Add a new memory to the knowledge base',
      method: 'POST',
      required_params: ['memory', 'user_email'],
    },
    generate_artifact: {
      name: 'generate_artifact',
      description: 'Create and save a code or markdown artifact',
      method: 'POST',
      required_params: ['title', 'type', 'content', 'user_email'],
    },
  };

  const info = toolInfo[toolName];
  if (!info) {
    return NextResponse.json(
      { error: `Unknown tool: ${toolName}` },
      { status: 404, headers: corsHeaders() }
    );
  }

  return NextResponse.json(info, { headers: corsHeaders() });
}

