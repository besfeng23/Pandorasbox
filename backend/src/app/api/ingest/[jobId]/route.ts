import { NextRequest, NextResponse } from 'next/server';
import { getProcessingJob } from '@/lib/pipelines/memoryPipeline';
import { getAuthAdmin } from '@/lib/firebase-admin';
import { handleOptions, corsHeaders } from '@/lib/cors';

export async function OPTIONS() {
  return handleOptions();
}

/**
 * Job Status API Route
 * Returns the current status of a processing job
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
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

    // 2. Get job ID from params
    const { jobId } = await params;
    if (!jobId) {
      return NextResponse.json({ error: 'Job ID is required' }, { status: 400, headers: corsHeaders() });
    }

    // 3. Retrieve job status
    const job = getProcessingJob(jobId);

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404, headers: corsHeaders() });
    }

    // 4. Verify job belongs to user
    if (job.userId !== userId) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders() });
    }

    // 5. Return job status
    return NextResponse.json(
      {
        id: job.id,
        status: job.status,
        filename: job.filename,
        totalChunks: job.totalChunks,
        processedChunks: job.processedChunks,
        createdAt: job.createdAt.toISOString(),
        updatedAt: job.updatedAt.toISOString(),
        error: job.error,
        progress: job.totalChunks > 0 ? (job.processedChunks / job.totalChunks) * 100 : 0,
      },
      { headers: corsHeaders() }
    );
  } catch (error: any) {
    console.error('Job Status API Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to retrieve job status.' },
      { status: 500, headers: corsHeaders() }
    );
  }
}

