
import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, handleApiError } from '@/server/api-auth';

export async function GET(req: NextRequest) {
    try {
        await requireAdmin(req);
        const logs = [
            { id: '1', level: 'info', message: 'System services initialized', timestamp: new Date(Date.now() - 1000 * 60 * 60).toISOString(), service: 'System' },
            { id: '2', level: 'info', message: 'vLLM Connection Established', timestamp: new Date(Date.now() - 1000 * 60 * 59).toISOString(), service: 'Inference' },
            { id: '3', level: 'info', message: 'Qdrant Collection Verified', timestamp: new Date(Date.now() - 1000 * 60 * 58).toISOString(), service: 'Memory' },
            { id: '4', level: 'warn', message: 'High latency detected on embedding generation', timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), service: 'Inference' },
            { id: '5', level: 'info', message: 'Scheduled maintenance complete', timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(), service: 'System' },
        ];
        return NextResponse.json({ logs });
    } catch (error) {
        return handleApiError(error);
    }
}
