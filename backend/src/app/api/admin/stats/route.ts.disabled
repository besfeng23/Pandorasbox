import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { getCollectionInfo } from '@/lib/sovereign/qdrant-client';

export const dynamic = 'force-dynamic';

// GET /api/admin/stats - Get admin dashboard statistics
export async function GET(req: NextRequest) {
    try {
        // 1. Authenticate User
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        const auth = getAuthAdmin();
        let decodedToken;
        try {
            decodedToken = await auth.verifyIdToken(token);
        } catch (e) {
            console.error('Token verification failed:', e);
            return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
        }

        const userId = decodedToken.uid;

        // 2. Gather Statistics
        const db = getFirestoreAdmin();

        // Get user's thread count
        const threadsSnapshot = await db.collection(`users/${userId}/threads`).count().get();
        const threadCount = threadsSnapshot.data().count;

        // Get user's document count
        const documentsSnapshot = await db.collection(`users/${userId}/documents`).count().get();
        const documentCount = documentsSnapshot.data().count;

        // Get user's artifact count
        const artifactsSnapshot = await db.collection('artifacts')
            .where('userId', '==', userId)
            .count()
            .get();
        const artifactCount = artifactsSnapshot.data().count;

        // Get vector count from Qdrant
        let vectorCount = 0;
        let qdrantStatus = 'offline';
        try {
            const collectionInfo = await getCollectionInfo('memories');
            vectorCount = collectionInfo?.points_count || 0;
            qdrantStatus = 'online';
        } catch (e) {
            console.warn('Failed to get Qdrant stats:', e);
        }

        // Check inference health
        let inferenceStatus = 'offline';
        try {
            const inferenceUrl = process.env.INFERENCE_URL || 'http://localhost:8000/v1';
            const response = await fetch(`${inferenceUrl}/models`, {
                signal: AbortSignal.timeout(5000)
            });
            if (response.ok) {
                inferenceStatus = 'online';
            }
        } catch (e) {
            console.warn('Inference health check failed:', e);
        }

        // Get recent activity (last 10 threads updated)
        const recentThreadsSnapshot = await db.collection(`users/${userId}/threads`)
            .orderBy('updatedAt', 'desc')
            .limit(10)
            .get();

        const recentActivity = recentThreadsSnapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                name: data.name || 'Untitled',
                updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            };
        });

        return NextResponse.json({
            stats: {
                threads: threadCount,
                documents: documentCount,
                artifacts: artifactCount,
                vectors: vectorCount,
            },
            services: {
                inference: inferenceStatus,
                memory: qdrantStatus,
            },
            recentActivity,
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('Admin Stats API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
