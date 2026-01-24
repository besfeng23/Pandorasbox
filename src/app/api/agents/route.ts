
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

export async function GET() {
  try {
    const activeAgents = await getActiveTools();
    return NextResponse.json({ success: true, agents: activeAgents }, { headers: corsHeaders() });
  } catch (error: any) {
    console.error('Error fetching active agents:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch agents', details: error.message },
      { status: 500, headers: corsHeaders() }
    );
  }
}


