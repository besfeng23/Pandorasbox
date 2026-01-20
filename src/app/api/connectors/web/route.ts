import { NextRequest, NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import { processAndStore } from '@/lib/knowledge/ingestor';
import { getAuthAdmin } from '@/lib/firebase-admin';

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.split(' ')[1];
    const decodedToken = await getAuthAdmin().verifyIdToken(token);
    const userId = decodedToken.uid;

    const { url, agentId } = await request.json();

    if (!url || !agentId) {
      return NextResponse.json({ error: 'Missing url or agentId' }, { status: 400 });
    }

    const response = await fetch(url);
    const html = await response.text();
    const $ = cheerio.load(html);

    // Remove scripts, styles, and other non-content elements
    $('script, style, nav, footer, header').remove();
    
    const text = $('body').text().replace(/\s+/g, ' ').trim();

    if (!text) {
        return NextResponse.json({ error: 'No content found at URL' }, { status: 400 });
    }

    const result = await processAndStore(text, url, agentId, userId);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('Web ingestion error:', error);
    return NextResponse.json({ error: error.message || 'Failed to ingest website' }, { status: 500 });
  }
}


