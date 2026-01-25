import { NextResponse } from 'next/server';

export async function GET() {
  const qdrantUrl = process.env.QDRANT_URL || 'http://localhost:6333';
  try {
    const res = await fetch(`${qdrantUrl}/collections`);
    if (res.ok) {
      return NextResponse.json({ status: 'online', service: 'Qdrant' });
    }
    return NextResponse.json({ status: 'offline', error: 'Qdrant returned non-200' }, { status: 503 });
  } catch (error) {
    return NextResponse.json({ status: 'offline', error: 'Connection failed' }, { status: 503 });
  }
}

