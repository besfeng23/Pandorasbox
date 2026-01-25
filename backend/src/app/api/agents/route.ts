
import { NextResponse } from 'next/server';

// 1. FIX CORS: Handle the browser's "Preflight" check
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Allow your frontend to talk to this
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
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
      name: 'Memory Bank',
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

