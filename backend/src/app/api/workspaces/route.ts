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
        const workspaces: any[] = [];
        const seenIds = new Set<string>();

        // 1. Fetch Owned Workspaces (Simple Query - Auto Index)
        try {
            const ownedSnapshot = await db.collection('workspaces').where('ownerId', '==', userId).get();
            ownedSnapshot.docs.forEach(doc => {
                const data = doc.data();
                workspaces.push({ id: doc.id, ...data });
                seenIds.add(doc.id);
            });
        } catch (e) {
            console.error('Failed to fetch owned workspaces:', e);
        }

        // 2. Fetch Shared Workspaces via Collection Group (Needs Index)
        try {
            // Find workspaces where the user is a member
            const membersSnapshot = await db.collectionGroup('members')
                .where('userId', '==', userId)
                .get();

            const workspaceIds = membersSnapshot.docs
                .map(doc => doc.ref.parent.parent?.id)
                .filter((id): id is string => !!id && !seenIds.has(id));

            if (workspaceIds.length > 0) {
                // Firestore 'in' query supports max 10/30 items, batch if needed or limit
                // For now, just slice top 10 to be safe
                const chunks = [];
                for (let i = 0; i < workspaceIds.length; i += 10) {
                    chunks.push(workspaceIds.slice(i, i + 10));
                }

                for (const chunk of chunks) {
                    const sharedSnapshot = await db.collection('workspaces')
                        .where('__name__', 'in', chunk)
                        .get();
                    sharedSnapshot.docs.forEach(doc => {
                        workspaces.push({ id: doc.id, ...doc.data() });
                    });
                }
            }
        } catch (error: any) {
            // Check for missing index error
            if (error.code === 9 || error.message?.includes('index')) {
                console.warn('Skipping shared workspaces due to missing index on collectionGroup query.');
            } else {
                console.error('Shared Workspaces Query Error:', error);
            }
        }

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
