
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Verify admin (or just valid user for this demo)
        const token = authHeader.split('Bearer ')[1];
        await getAuthAdmin().verifyIdToken(token);

        // Fetch users from Firestore 'users' collection or Auth (Auth is better but requires higher privs usually)
        // We'll trust Firestore 'users' collection as the source of profile truth
        const db = getFirestoreAdmin();
        const usersSnapshot = await db.collection('users').limit(50).get();

        const users = usersSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            lastLogin: doc.data().lastLogin?.toDate?.()?.toISOString() || null,
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        }));

        return NextResponse.json({ users });
    } catch (error: any) {
        console.error('Admin Users API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
