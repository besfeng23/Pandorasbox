import { NextRequest, NextResponse } from 'next/server';
import { handleOptions, corsHeaders } from '@/lib/cors';
import { getFirestoreAdmin } from '@/lib/firebase-admin';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * Get a specific document
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string; documentId: string }> }
) {
  try {
    const { collection, documentId } = await params;
    const db = getFirestoreAdmin();
    const doc = await db.collection(collection).doc(documentId).get();
    
    if (!doc.exists) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404, headers: corsHeaders() });
    }
    
    const data = doc.data();
    // Convert Firestore timestamps to ISO strings
    const convertedData = Object.fromEntries(
      Object.entries(data || {}).map(([key, value]) => {
        if (value && typeof value === 'object' && 'toDate' in value) {
          return [key, (value as any).toDate().toISOString()];
        }
        return [key, value];
      })
    );
    
    return NextResponse.json({
      id: doc.id,
      collection,
      ...convertedData,
    }, { headers: corsHeaders() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}

/**
 * Update a document
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string; documentId: string }> }
) {
  try {
    const { collection, documentId } = await params;
    const body = await request.json();
    
    const db = getFirestoreAdmin();
    await db.collection(collection).doc(documentId).update(body);
    
    return NextResponse.json({
      id: documentId,
      collection,
      success: true,
    }, { headers: corsHeaders() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}

/**
 * Delete a document
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ collection: string; documentId: string }> }
) {
  try {
    const { collection, documentId } = await params;
    const db = getFirestoreAdmin();
    await db.collection(collection).doc(documentId).delete();
    
    return NextResponse.json({
      id: documentId,
      collection,
      success: true,
    }, { headers: corsHeaders() });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    return NextResponse.json({ error: message }, { status: 500, headers: corsHeaders() });
  }
}

