import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  const agents = [
    {
      name: 'search_knowledge_base',
      description: 'Search the knowledge base using semantic search.',
    },
    {
      name: 'add_memory',
      description: 'Add a new memory to the knowledge base.',
    },
    {
      name: 'generate_artifact',
      description: 'Create and save a code or markdown artifact.',
    },
  ];

  return NextResponse.json({ agents }, { headers: corsHeaders(request) });
}
