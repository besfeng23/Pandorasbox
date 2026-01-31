import { NextRequest, NextResponse } from 'next/server';
export const dynamic = 'force-dynamic';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

// GET /api/artifacts - List all artifacts for current user
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

        // 2. Query artifacts from Firestore
        const db = getFirestoreAdmin();
        const artifactsRef = db.collection('artifacts');
        const snapshot = await artifactsRef
            .where('userId', '==', userId)
            .orderBy('createdAt', 'desc')
            .limit(50)
            .get();

        const artifacts = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                title: data.title || 'Untitled',
                type: data.type || 'code',
                content: data.content || '',
                language: data.language || '',
                threadId: data.threadId,
                createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            };
        });

        return NextResponse.json({ artifacts });

    } catch (error: any) {
        console.error('Artifacts API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// POST /api/artifacts - Create a new artifact
export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const auth = getAuthAdmin();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        const body = await req.json();
        const { title, type, content, language, threadId } = body;

        if (!title || !content) {
            return NextResponse.json({ error: 'Title and content are required' }, { status: 400 });
        }

        const db = getFirestoreAdmin();
        const artifactRef = db.collection('artifacts').doc();

        const artifactData = {
            userId,
            title,
            type: type || 'code',
            content,
            language: language || 'plaintext',
            threadId: threadId || null,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        };

        await artifactRef.set(artifactData);

        return NextResponse.json({
            id: artifactRef.id,
            ...artifactData,
            // Return ISO string for client immediately
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Create Artifact Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/artifacts?id=xxx - Delete an artifact
export async function DELETE(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];

        const auth = getAuthAdmin();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        const { searchParams } = new URL(req.url);
        const artifactId = searchParams.get('id');

        if (!artifactId) {
            return NextResponse.json({ error: 'Artifact ID required' }, { status: 400 });
        }

        const db = getFirestoreAdmin();
        const artifactRef = db.collection('artifacts').doc(artifactId);
        const doc = await artifactRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Artifact not found' }, { status: 404 });
        }

        // Verify ownership
        if (doc.data()?.userId !== userId) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        await artifactRef.delete();

        return NextResponse.json({ success: true });

    } catch (error: any) {
        console.error('Delete Artifact Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
