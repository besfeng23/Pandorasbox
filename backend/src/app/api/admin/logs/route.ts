
import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebase-admin';

export async function GET(req: NextRequest) {
    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const token = authHeader.split('Bearer ')[1];
        await getAuthAdmin().verifyIdToken(token);

        // Mock system logs + real events could be added here
        // For now, we generate realistic system logs
        const logs = [
            { id: '1', level: 'info', message: 'System services initialized', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), service: 'System' },
            { id: '2', level: 'info', message: 'vLLM Connection Established', timestamp: new Date(Date.now() - 1000 * 60 * 59).toISOString(), service: 'Inference' },
            { id: '3', level: 'info', message: 'Qdrant Collection Verified', timestamp: new Date(Date.now() - 1000 * 60 * 58).toISOString(), service: 'Memory' },
            { id: '4', level: 'warn', message: 'High latency detected on embedding generation', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), service: 'Inference' },
            { id: '5', level: 'info', message: 'Scheduled maintenance complete', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), service: 'System' },
        ];

        return NextResponse.json({ logs });
    } catch (error: any) {
        console.error('Admin Logs API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
