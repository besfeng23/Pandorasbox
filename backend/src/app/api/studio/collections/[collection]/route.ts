import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { getFirestoreAdmin } from '@/lib/firebase-admin';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * Get documents from a collection with pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '50');
    const startAfter = searchParams.get('startAfter');
    const orderBy = searchParams.get('orderBy') || 'createdAt';
    const orderDirection = searchParams.get('orderDirection') || 'desc';
    
    const db = getFirestoreAdmin();
    let query = db.collection(collection)
      .orderBy(orderBy, orderDirection as 'asc' | 'desc')
      .limit(limit);
    
    if (startAfter) {
      const startDoc = await db.collection(collection).doc(startAfter).get();
      if (startDoc.exists) {
        query = query.startAfter(startDoc);
      }
    }
    
    const snapshot = await query.get();
    const documents = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      // Convert Firestore timestamps to ISO strings
      ...Object.fromEntries(
        Object.entries(doc.data()).map(([key, value]) => {
          if (value && typeof value === 'object' && 'toDate' in value) {
            return [key, (value as any).toDate().toISOString()];
          }
          return [key, value];
        })
      ),
    }));
    
    return NextResponse.json({
      collection,
      documents,
      count: documents.length,
      hasMore: snapshot.docs.length === limit,
      lastDocId: snapshot.docs[snapshot.docs.length - 1]?.id,
    }, { headers: corsHeaders() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}

/**
 * Create a new document in a collection
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string }> }
) {
  try {
    const { collection } = await params;
    const body = await request.json();
    
    const db = getFirestoreAdmin();
    const docRef = await db.collection(collection).add(body);
    
    return NextResponse.json({
      id: docRef.id,
      collection,
      success: true,
    }, { headers: corsHeaders() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}

