import { NextRequest, NextResponse } from 'next/server';
import { getKnowledgeGraphSnapshot, updateKnowledgeGraphFromMemory } from '@/lib/knowledge-graph';
import { searchMemories } from '@/lib/vector';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function jsonResponse(data: unknown, status = 200) {
  return NextResponse.json(data, { status });
}

export interface KnowledgeGraphRequestPayload {
  userId: string;
  query?: string;
  limit?: number;
  memoryId?: string;
  content?: string;
}

export async function handleKnowledgeGraphRequest(payload: KnowledgeGraphRequestPayload) {
  if (!payload.userId) {
    return { error: 'userId is required.' };
  }

  if (payload.memoryId && payload.content) {
    const snapshot = await updateKnowledgeGraphFromMemory({
      userId: payload.userId,
      memoryId: payload.memoryId,
      content: payload.content,
    });

    return { success: true, snapshot };
  }

  const query = payload.query?.trim() ?? '';
  const limit = payload.limit ?? 10;
  let memoryIds: string[] | undefined;
  let memories: Array<{ id: string; content: string; score: number }> = [];

  if (query) {
    const searchResults = await searchMemories(query, payload.userId, limit);
    memoryIds = searchResults.map(result => result.id);
    memories = searchResults.map(result => ({
      id: result.id,
      content: result.text,
      score: result.score,
    }));
  }

  const graph = await getKnowledgeGraphSnapshot({
    userId: payload.userId,
    memoryIds,
  });

  return {
    success: true,
    query,
    graph,
    memories,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as KnowledgeGraphRequestPayload;
    const result = await handleKnowledgeGraphRequest(body);

    if ('error' in result) {
      return jsonResponse(result, 400);
    }

    return jsonResponse(result);
  } catch (error: any) {
    console.error('[knowledge-graph] Error handling request:', error);
    return jsonResponse({ error: 'Failed to process knowledge graph request.' }, 500);
  }
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get('userId');
  if (!userId) {
    return jsonResponse({ error: 'userId is required.' }, 400);
  }

  const graph = await getKnowledgeGraphSnapshot({ userId });
  return jsonResponse({ success: true, graph });
}
