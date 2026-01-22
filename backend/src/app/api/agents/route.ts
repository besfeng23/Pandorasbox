
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // In a real implementation, this would list tools from src/mcp/index.ts
    // For now, we return the standard tools as defined in the mental model
    const tools = [
      {
        name: 'search_knowledge_base',
        description: 'Search the knowledge base using semantic search across memories and history.',
        capabilities: ['semantic-search', 'qdrant']
      },
      {
        name: 'add_memory',
        description: 'Add a new memory to the knowledge base for future retrieval.',
        capabilities: ['storage', 'embeddings']
      },
      {
        name: 'generate_artifact',
        description: 'Create and save code or markdown artifacts for visual rendering.',
        capabilities: ['artifacts', 'visualization']
      }
    ];

    return NextResponse.json({ agents: tools });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, PATCH',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

