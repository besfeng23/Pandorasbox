import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { requireUser, unauthorizedResponse } from '@/server/api-auth';

export async function OPTIONS(request: NextRequest) {
  return handleOptions(request);
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireUser(request);
    const firestoreAdmin = getFirestoreAdmin();
    const snapshot = await firestoreAdmin.collection('users').doc(user.uid).collection('connectors').get();

    const connectors = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      updatedAt: doc.data().updatedAt?.toDate?.()?.toISOString?.(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString?.(),
    }));

    return NextResponse.json({ connectors }, { headers: corsHeaders(request) });
  } catch {
    return unauthorizedResponse();
  }
}
