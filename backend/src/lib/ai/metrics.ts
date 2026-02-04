import { getFirestoreAdmin } from '@/lib/firebase-admin';

export interface InteractionMetric {
    traceId: string;
    agentId: string;
    intent: string;
    latencyMs: number;
    tokensIn: number;
    tokensOut: number;
    qualityMode: string;
    wasSuccess: boolean;
    timestamp: number;
}

const COLLECTION = 'system/ai/metrics';

/**
 * Log performance metrics for every AI turn.
 */
export async function logMetric(metric: InteractionMetric) {
    // Fire and forget
    const db = getFirestoreAdmin();
    db.collection(COLLECTION).add(metric).catch(e => console.error('Failed to log metric:', e));
}

/**
 * Get aggregated stats for an agent (for daily dashboards).
 */
export async function getDailyStats(agentId: string) {
    // Requires Firestore indexing...
    // Placeholder implementation
    return {
        avgLatency: 0,
        totalTokens: 0,
        errorRate: 0
    };
}
