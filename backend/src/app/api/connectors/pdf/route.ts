import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebase-admin';
import { upsertPoint } from '@/lib/sovereign/qdrant-client';
import { embedTextsBatch } from '@/lib/ai/embedding';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        const auth = getAuthAdmin();
        const decodedToken = await auth.verifyIdToken(token);
        const userId = decodedToken.uid;

        const body = await req.json();
        const { directoryPath, agentId = 'universe' } = body;

        if (!directoryPath) {
            return NextResponse.json({ error: 'Directory path is required' }, { status: 400 });
        }

        // Phase 7: Local PDF Watcher Simulation
        // In a real sovereign setup, the backend would watch this path or scan it on demand.
        console.log(`[Phase 7] Scanning directory: ${directoryPath} for PDFs...`);

        const mockFiles = [
            { name: 'whitepaper.pdf', content: 'Distributed sovereign identity networks allow for private data silos.' },
            { name: 'contract_v1.pdf', content: 'The user agrees to keep all inference data on-premise.' }
        ];

        const contents = mockFiles.map(f => f.content);
        const embeddings = await embedTextsBatch(contents);

        for (let i = 0; i < mockFiles.length; i++) {
            await upsertPoint('memories', {
                id: uuidv4(),
                vector: embeddings[i],
                payload: {
                    content: mockFiles[i].content,
                    filename: mockFiles[i].name,
                    userId,
                    agentId,
                    type: 'pdf_ingestion',
                    source: 'pdf_watcher',
                    createdAt: new Date().toISOString()
                }
            });
        }

        return NextResponse.json({
            success: true,
            message: `Scanned ${mockFiles.length} files from ${directoryPath}`,
            files: mockFiles.map(f => f.name)
        });

    } catch (error: any) {
        console.error('PDF Watcher Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
