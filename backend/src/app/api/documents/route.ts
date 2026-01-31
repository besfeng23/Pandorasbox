import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { deletePointsByFilter } from '@/lib/sovereign/qdrant-client';

export const dynamic = 'force-dynamic';

// GET /api/documents - List all uploaded documents for current user
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

        // 2. Query documents from Firestore
        const db = getFirestoreAdmin();
        const documentsRef = db.collection(`users/${userId}/documents`);
        const snapshot = await documentsRef
            .orderBy('createdAt', 'desc')
            .limit(100)
            .get();

        const documents = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                filename: data.filename || 'Unknown',
                fileType: data.fileType || 'unknown',
                fileSize: data.fileSize || 0,
                chunkCount: data.chunkCount || 0,
                status: data.status || 'completed',
                agentId: data.agentId || 'universe',
                createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
            };
        });

        return NextResponse.json({ documents });

    } catch (error: any) {
        console.error('Documents API Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}

// DELETE /api/documents?id=xxx - Delete a document and its chunks from Qdrant
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
        const documentId = searchParams.get('id');

        if (!documentId) {
            return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
        }

        const db = getFirestoreAdmin();
        const documentRef = db.collection(`users/${userId}/documents`).doc(documentId);
        const doc = await documentRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: 'Document not found' }, { status: 404 });
        }

        const docData = doc.data();
        const filename = docData?.filename;

        // Delete from Firestore
        await documentRef.delete();

        // Delete related vectors from Qdrant by source (filename)
        try {
            await deletePointsByFilter('memories', {
                must: [
                    { key: 'userId', match: { value: userId } },
                    { key: 'filename', match: { value: filename } }
                ]
            });
            console.log(`[Documents] Deleted vectors for ${filename} in Qdrant.`);
        } catch (qdrantError) {
            console.error(`[Documents] Failed to delete vectors from Qdrant for ${filename}:`, qdrantError);
            // We continue as the firestore record is already gone, or we might want to throw?
            // Usually best to be best-effort or warn.
        }

        console.log(`[Documents] Deleted document ${filename} (${documentId}) for user ${userId}`);

        return NextResponse.json({ success: true, deletedFilename: filename });

    } catch (error: any) {
        console.error('Delete Document Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
