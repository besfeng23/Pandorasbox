
import { NextResponse } from 'next/server';
import { getActiveTools } from '@/mcp'; // Assuming this path is correct based on rules

// Prevent this route from being statically generated
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// CORS headers helper
function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key',
  };
}

// Handle OPTIONS request for CORS preflight
export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders() });
}

// 2. SERVE DATA: Return the list of "Agents" (Tools)
export async function GET() {
  // Define the capabilities of your Sovereign Stack based on MCP tools
  const agents = [
    {
      id: 'search_knowledge_base',
      name: 'Knowledge Base',
      description: 'Search the knowledge base using semantic search (Qdrant).',
      status: 'active',
    },
    {
      id: 'add_memory',
      name: 'Memory Bank Bank',
      description: 'Add new memories to the knowledge base.',
      status: 'active',
    },
    {
      id: 'generate_artifact',
      name: 'Artifact Builder',
      description: 'Create code and markdown artifacts.',
      status: 'active',
    },
    {
      id: 'web-search',
      name: 'Live Web Access',
      description: 'Disabled in Sovereign Mode (Air-Gapped).',
      status: 'inactive',
    }
  ];

  return NextResponse.json({ agents }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
}


