
import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { requireAdmin, handleApiError } from '@/server/api-auth';

export async function GET(req: NextRequest) {
    try {
        await requireAdmin(req);
        const db = getFirestoreAdmin();
        const usersSnapshot = await db.collection('users').limit(50).get();
        const users = usersSnapshot.docs.map(doc => ({
            uid: doc.id,
            ...doc.data(),
            lastLogin: doc.data().lastLogin?.toDate?.()?.toISOString() || null,
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || null,
        }));
        return NextResponse.json({ users });
    } catch (error) {
        return handleApiError(error);
    }
}
