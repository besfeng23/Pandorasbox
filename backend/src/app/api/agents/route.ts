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
      name: 'search_knowledge_base',
      description: 'Search the knowledge base using semantic search. Searches both conversation history and stored memories to find relevant information.',
    },
    {
      name: 'add_memory',
      description: 'Add a new memory to the knowledge base. The memory will be stored with an embedding for future semantic search.',
    },
    {
      name: 'generate_artifact',
      description: 'Create and save a code or markdown artifact. Artifacts can be code snippets, documentation, or other structured content.',
    }
  ];

  return NextResponse.json({ agents }, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
