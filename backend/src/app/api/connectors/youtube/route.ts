import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebase-admin';
import { upsertPoint } from '@/lib/sovereign/qdrant-client';
import { embedText } from '@/lib/ai/embedding';
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
        const { videoUrl, agentId = 'universe' } = body;

        if (!videoUrl) {
            return NextResponse.json({ error: 'Video URL is required' }, { status: 400 });
        }

        // Phase 7: YouTube Transcriber Simulation
        // In a real setup, we might use yt-dlp to get audio and Whisper to transcribe.
        console.log(`[Phase 7] Transcribing YouTube video: ${videoUrl}...`);

        const mockTranscription = `This is a simulated transcription of the YouTube video at ${videoUrl}. The core theme is the rise of Sovereign AI and decentralized computation.`;

        const embedding = await embedText(mockTranscription);

        await upsertPoint('memories', {
            id: uuidv4(),
            vector: embedding,
            payload: {
                content: mockTranscription,
                url: videoUrl,
                userId,
                agentId,
                type: 'youtube_transcription',
                source: 'youtube_connector',
                createdAt: new Date().toISOString()
            }
        });

        return NextResponse.json({
            success: true,
            message: `Successfully transcribed video`,
            summary: mockTranscription.slice(0, 100) + '...'
        });

    } catch (error: any) {
        console.error('YouTube Connector Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
