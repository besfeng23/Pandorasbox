import { NextResponse } from 'next/server';

// 1. FIX CORS: Handle the security check
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

// 2. PROVIDE DATA: Return the list of agents
export async function GET() {
  const agents = [
    {
      name: 'Search Knowledge Base',
      description: 'Semantic search across memories and history using Qdrant.',
    },
    {
      name: 'Add Memory',
      description: 'Store new memories with embeddings in Firestore and Qdrant.',
    },
    {
      name: 'Generate Artifact',
      description: 'Create and save code or markdown artifacts for later use.',
    }
  ];

  return NextResponse.json({ agents }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
