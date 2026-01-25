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
      id: 'builder',
      name: 'Builder',
      description: 'Specialized in code generation and architecture.',
      status: 'active',
    },
    {
      id: 'universe',
      name: 'Universe',
      description: 'General knowledge and creative exploration.',
      status: 'active',
    }
  ];

  return NextResponse.json(agents, {
    headers: { 'Access-Control-Allow-Origin': '*' },
  });
}
