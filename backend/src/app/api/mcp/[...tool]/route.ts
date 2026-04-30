import { NextRequest, NextResponse } from 'next/server';
import { corsHeaders, handleOptions } from '@/lib/cors';
import { handleSearchKnowledgeBase } from '@/mcp/tools/search-knowledge';
import { handleAddMemory } from '@/mcp/tools/add-memory';
import { handleGenerateArtifact } from '@/mcp/tools/generate-artifact';
import { adminDb } from '@/firebase/admin';
import { requireUser, handleApiError } from '@/server/api-auth';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

async function validateApiKey(request: NextRequest): Promise<boolean> {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) return false;

  const keysSnapshot = await adminDb.collection('api_clients').where('apiKey', '==', apiKey).limit(1).get();
  return !keysSnapshot.empty;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ tool: string[] }> }) {
  try {
    let verifiedEmail: string | undefined;

    try {
      const user = await requireUser(request);
      verifiedEmail = user.email;
    } catch {
      const hasValidKey = await validateApiKey(request);
      if (!hasValidKey) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(request) });
      }
    }

    const { tool } = await params;
    const toolName = tool?.[0];

    if (!toolName) {
      return NextResponse.json({ error: 'Tool name is required in the URL path' }, { status: 400, headers: corsHeaders(request) });
    }

    const body = await request.json();
    const effectiveUserEmail = verifiedEmail || body.user_email;

    let result: any;
    switch (toolName) {
      case 'search_knowledge_base': {
        if (!body.query || !effectiveUserEmail) {
          return NextResponse.json({ error: 'Missing required parameters: query' }, { status: 400, headers: corsHeaders(request) });
        }
        result = await handleSearchKnowledgeBase({ query: body.query, user_email: effectiveUserEmail, limit: body.limit });
        break;
      }
      case 'add_memory': {
        if (!body.memory || !effectiveUserEmail) {
          return NextResponse.json({ error: 'Missing required parameters: memory' }, { status: 400, headers: corsHeaders(request) });
        }
        result = await handleAddMemory({ memory: body.memory, user_email: effectiveUserEmail });
        break;
      }
      case 'generate_artifact': {
        if (!body.title || !body.type || !body.content || !effectiveUserEmail) {
          return NextResponse.json({ error: 'Missing required parameters: title, type, content' }, { status: 400, headers: corsHeaders(request) });
        }
        result = await handleGenerateArtifact({ title: body.title, type: body.type, content: body.content, user_email: effectiveUserEmail });
        break;
      }
      default:
        return NextResponse.json({ error: `Unknown tool: ${toolName}` }, { status: 404, headers: corsHeaders(request) });
    }

    return NextResponse.json({ success: true, result }, { headers: corsHeaders(request) });
  } catch (error) {
    return handleApiError(error, request, 'MCP bridge failed');
  }
}
