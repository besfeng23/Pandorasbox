import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
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

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const agentId = formData.get('agentId') as string;

    if (!file || !agentId) {
      return NextResponse.json({ error: 'Missing file or agentId' }, { status: 400 });
    }

    let text = '';
    const buffer = Buffer.from(await file.arrayBuffer());

    if (file.type === 'application/pdf') {
      const data = await pdfParse(buffer);
      text = data.text;
    } else if (file.type.startsWith('text/') || file.name.endsWith('.md') || file.name.endsWith('.txt')) {
      text = buffer.toString('utf-8');
    } else {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
    }

    if (!text.trim()) {
        return NextResponse.json({ error: 'File is empty or could not be parsed' }, { status: 400 });
    }

    const result = await processAndStore(text, file.name, agentId, userId);

    return NextResponse.json(result);

  } catch (error: any) {
    console.error('File ingestion error:', error);
    return NextResponse.json({ error: error.message || 'Failed to ingest file' }, { status: 500 });
  }
}


