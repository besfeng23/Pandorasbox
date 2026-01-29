
import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin, getFirestoreAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { embedText } from '@/lib/ai/embedding';
import { upsertPoint } from '@/lib/sovereign/qdrant-client';
import { v4 as uuidv4 } from 'uuid';

// Helper to simulate GitHub fetching (in real prod, use 'octokit')
// Since we are in a protected environment, we will simulate the "fetch" 
// by successfully returning a mock file tree for a demo repo.
async function fetchGithubRepo(url: string) {
    // Phase 7: Real implementation would use Octokit to fetch the tree.
    // For now, we simulate ingesting a "Hello World" repo structure.
    return [
        { path: 'README.md', content: '# Demo Repo\nThis is an ingested repo.' },
        { path: 'src/index.ts', content: 'console.log("Hello World");' },
        { path: 'package.json', content: '{ "name": "demo-repo" }' }
    ];
}

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const body = await req.json();
        const { repoUrl, agentId = 'builder', workspaceId } = body;

        if (!repoUrl) return NextResponse.json({ error: 'Repo URL required' }, { status: 400 });

        // 1. Fetch Repo Content
        const files = await fetchGithubRepo(repoUrl);
        const processingDetails = [];

        // 2. Ingest into Qdrant
        for (const file of files) {
            const vector = await embedText(file.content);
            const memoryId = uuidv4();

            await upsertPoint('memories', {
                id: memoryId,
                vector: vector,
                payload: {
                    content: `[FILE: ${file.path}]\n${file.content}`,
                    source: repoUrl,
                    type: 'knowledge_repo',
                    userId: 'shared', // or specific user
                    workspaceId: workspaceId || null,
                    createdAt: new Date().toISOString()
                }
            });
            processingDetails.push(`Ingested: ${file.path}`);
        }

        return NextResponse.json({ success: true, details: processingDetails });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
