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
  // Define the capabilities of your Sovereign Stack
  const agents = [
    {
      id: 'memory-search',
      name: 'Memory Search',
      description: 'Searches your local Qdrant vector database for past context.',
      status: 'active',
    },
    {
      id: 'web-search',
      name: 'Live Web Access',
      description: 'Disabled in Sovereign Mode (Air-Gapped).',
      status: 'inactive',
    },
    {
      id: 'code-interpreter',
      name: 'Artifact Builder',
      description: 'Generates and executes code artifacts locally.',
      status: 'active',
    }
  ];

  return NextResponse.json(agents, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  });
}
