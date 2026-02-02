import { NextRequest, NextResponse } from 'next/server';
import { scrollPoints } from '@/lib/sovereign/qdrant-client';
import { getAuthAdmin } from '@/lib/firebase-admin';

export const dynamic = 'force-dynamic';

/**
 * GET /api/memory/list
 * Fetches recent memories (facts and episodic) for the authenticated user.
 */
export async function GET(req: NextRequest) {
    try {
        // 1. Authenticate user
        const authHeader = req.headers.get('Authorization');
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const auth = getAuthAdmin();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        const { searchParams } = new URL(req.url);
        const agentId = searchParams.get('agentId') || 'universe';
        const limit = parseInt(searchParams.get('limit') || '50');

        const collectionName = agentId === 'universe' ? 'memories' : `memories__${agentId}`;

        // 2. Fetch points from Qdrant using scroll (no vectors needed)
        const filter = {
            must: [
                { key: 'uid', match: { value: userId } }
            ]
        };

        const points = await scrollPoints(collectionName, limit, filter);

        // 3. Sort by createdAt desc
        const sortedPoints = points.sort((a, b) => {
            const aTime = new Date(a.payload?.createdAt || 0).getTime();
            const bTime = new Date(b.payload?.createdAt || 0).getTime();
            return bTime - aTime;
        });

        return NextResponse.json({
            success: true,
            memories: sortedPoints.map(p => ({
                id: p.id,
                content: p.payload?.content || '',
                type: p.payload?.type || 'episodic',
                createdAt: p.payload?.createdAt,
                agentId: p.payload?.agentId || agentId
            }))
        });

    } catch (error: any) {
        console.error('[API] Memory List Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
