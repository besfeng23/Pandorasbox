import { getFirestoreAdmin } from '@/lib/firebase-admin';

export interface AgentPerformance {
    agentId: string;
    successfulTasks: number;
    failedTasks: number;
    averageScore: number; // 0-1
    lastUpdated?: number;
}

const COLLECTION_NAME = 'system/agent-learning/stats';

/**
 * Tracks agent performance and persists to Firestore.
 */
export async function trackPerformance(agentId: string, success: boolean, score: number = 1.0) {
    const db = getFirestoreAdmin();
    const docRef = db.doc(`${COLLECTION_NAME}/${agentId}`);

    try {
        await db.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            const current: AgentPerformance = doc.exists ? doc.data() as AgentPerformance : {
                agentId,
                successfulTasks: 0,
                failedTasks: 0,
                averageScore: 0.5
            };

            if (success) {
                current.successfulTasks++;
            } else {
                current.failedTasks++;
            }

            // Weighted moving average (favoring recent 50 interactions)
            const weight = 0.1;
            current.averageScore = (current.averageScore * (1 - weight)) + (score * weight);
            current.lastUpdated = Date.now();

            t.set(docRef, current);
        });
    } catch (error) {
        console.error(`[AgentLearning] Failed to track performance for ${agentId}:`, error);
    }
}

/**
 * Retrieves agent capabilities based on historical performance.
 */
export async function getAgentCapabilities(agentId: string): Promise<string[]> {
    const db = getFirestoreAdmin();
    try {
        const doc = await db.doc(`${COLLECTION_NAME}/${agentId}`).get();
        if (!doc.exists) return ['Generalist'];

        const stats = doc.data() as AgentPerformance;
        const caps: string[] = [];

        if (stats.averageScore > 0.9) caps.push('Expert');
        else if (stats.averageScore > 0.7) caps.push('Competent');
        else caps.push('Novice');

        if (stats.successfulTasks > 50) caps.push('Veteran');

        return caps;
    } catch (error) {
        console.warn(`[AgentLearning] Failed to fetch capabilities for ${agentId}`, error);
        return ['Generalist'];
    }
}

export async function adaptStrategy(agentId: string, task: string): Promise<string> {
    const caps = await getAgentCapabilities(agentId);

    if (caps.includes('Expert')) {
        return `As an Expert ${agentId} (Score: High), you have full autonomy. Execute complex strategic reasoning for: ${task}`;
    }
    if (caps.includes('Veteran')) {
        return `As a Veteran ${agentId}, rely on your extensive experience to solve: ${task}`;
    }

    return `As a developing ${agentId}, verify your steps carefully and show your work for: ${task}`;
}
