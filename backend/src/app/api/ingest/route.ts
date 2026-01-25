import { NextRequest, NextResponse } from 'next/server';
import pdfParse from 'pdf-parse';
import { startMemoryPipeline } from '@/lib/pipelines/memoryPipeline';
import { getAuthAdmin } from '@/lib/firebase-admin';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * Ingestion API Route
 * Handles file uploads and initiates the memory pipeline asynchronously
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Authentication/Authorization
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders() });
    }

    const token = authHeader.split(' ')[1];
    let userId: string;
    try {
      const decodedToken = await getAuthAdmin().verifyIdToken(token);
      userId = decodedToken.uid;
    } catch (error: any) {
      return NextResponse.json(
        { error: error.message || 'Unauthorized' },
        { status: 401, headers: corsHeaders() }
      );
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const agentId = (formData.get('agentId') as string) || 'universe';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400, headers: corsHeaders() });
    }

    const filename = file.name;

    // 3. Read File Content
    let content = '';
    const buffer = Buffer.from(await file.arrayBuffer());

    if (file.type === 'application/pdf') {
      try {
        const data = await pdfParse(buffer);
        content = data.text;
      } catch (pdfError: any) {
        return NextResponse.json(
          { error: `Failed to parse PDF: ${pdfError.message}` },
          { status: 400, headers: corsHeaders() }
        );
      }
    } else if (
      file.type.startsWith('text/') ||
      filename.endsWith('.md') ||
      filename.endsWith('.txt') ||
      filename.endsWith('.markdown')
    ) {
      content = buffer.toString('utf-8');
    } else {
      return NextResponse.json(
        { error: 'Unsupported file type. Supported: PDF, TXT, MD' },
        { status: 400, headers: corsHeaders() }
      );
    }

    if (!content.trim()) {
      return NextResponse.json({ error: 'File is empty or could not be parsed' }, { status: 400, headers: corsHeaders() });
    }

    // 4. Start Pipeline Asynchronously
    const job = await startMemoryPipeline(content, filename, userId, agentId);

    return NextResponse.json(
      {
        message: `Ingestion started for ${filename}.`,
        jobId: job.id,
        status: job.status,
        totalChunks: job.totalChunks,
      },
      { status: 202, headers: corsHeaders() }
    ); // 202 Accepted, processing is happening
  } catch (error: any) {
    console.error('Ingestion API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to start ingestion process.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

