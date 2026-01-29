import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { Workspace, WorkspaceMember } from '@/lib/types';

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const auth = getAuthAdmin();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        const db = getFirestoreAdmin();

        // Find workspaces where the user is a member
        const membersSnapshot = await db.collectionGroup('members')
            .where('userId', '==', userId)
            .get();

        const workspaceIds = membersSnapshot.docs.map(doc => doc.ref.parent.parent?.id).filter(Boolean);

        if (workspaceIds.length === 0) {
            return NextResponse.json({ workspaces: [] });
        }

        const workspacesSnapshot = await db.collection('workspaces')
            .where('__name__', 'in', workspaceIds)
            .get();

        const workspaces = workspacesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        return NextResponse.json({ workspaces });

    } catch (error: any) {
        console.error('Workspaces GET Error:', error);
        // detailed logging
        if (error.code === 9) {
            console.error('Likely missing Firestore Index for collectionGroup query.');
        }
        // Return empty list gracefully instead of crashing the UI
        return NextResponse.json({ workspaces: [] });
    }
}

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
        const { name, description } = body;

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        const db = getFirestoreAdmin();
        const workspaceRef = db.collection('workspaces').doc();

        const workspaceData = {
            name,
            description: description || '',
            ownerId: userId,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
            settings: {
                isPrivate: true
            }
        };

        await db.runTransaction(async (transaction) => {
            transaction.set(workspaceRef, workspaceData);

            const memberRef = workspaceRef.collection('members').doc(userId);
            transaction.set(memberRef, {
                userId,
                role: 'owner',
                joinedAt: FieldValue.serverTimestamp()
            });
        });

        return NextResponse.json({
            id: workspaceRef.id,
            ...workspaceData
        });

    } catch (error: any) {
        console.error('Workspace POST Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
