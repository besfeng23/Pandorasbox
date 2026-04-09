import { NextRequest, NextResponse } from 'next/server';
import { searchMemoryAction, createMemoryFromSettings } from '@/app/actions';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { handleApiError, requireUser } from '@/server/api-auth';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agentId') || 'builder';
    const query = searchParams.get('query') || '';

    const results = await searchMemoryAction(query, user.uid, agentId);
    return NextResponse.json(results, { headers: corsHeaders(request) });
  } catch (error) {
    return handleApiError(error, request, '/api/memories GET failed');
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const searchParams = request.nextUrl.searchParams;
    const agentId = searchParams.get('agentId') || 'builder';
    const { content } = await request.json();
    const result = await createMemoryFromSettings(content, user.uid, agentId);
    return NextResponse.json(result, { headers: corsHeaders(request) });
  } catch (error) {
    return handleApiError(error, request, '/api/memories POST failed');
  }
}
