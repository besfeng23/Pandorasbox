
export interface AgentPerformance {
    agentId: string;
    successfulTasks: number;
    failedTasks: number;
    averageScore: number; // 0-1
}

// In-memory cache for now (Mocking persistence)
const PERFORMANCE_CACHE: Record<string, AgentPerformance> = {
    'builder': { agentId: 'builder', successfulTasks: 10, failedTasks: 0, averageScore: 0.95 },
    'analyst': { agentId: 'analyst', successfulTasks: 8, failedTasks: 1, averageScore: 0.88 },
    'universe': { agentId: 'universe', successfulTasks: 15, failedTasks: 2, averageScore: 0.92 },
};

/**
 * Agent Learning: Tracks performance to optimize delegation.
 */
export async function trackPerformance(agentId: string, success: boolean, score: number = 1.0) {
    const current = PERFORMANCE_CACHE[agentId] || { agentId, successfulTasks: 0, failedTasks: 0, averageScore: 0.5 };

    if (success) {
        current.successfulTasks++;
    } else {
        current.failedTasks++;
    }

    // Simple moving average
    const total = current.successfulTasks + current.failedTasks;
    current.averageScore = ((current.averageScore * (total - 1)) + score) / total;

    PERFORMANCE_CACHE[agentId] = current;
    // TODO: Persist to Firestore
}

export function getAgentCapabilities(agentId: string): string[] {
    const stats = PERFORMANCE_CACHE[agentId];
    if (!stats) return ['Generalist'];

    const caps: string[] = [];
    if (stats.averageScore > 0.9) caps.push('Expert');
    else if (stats.averageScore > 0.7) caps.push('Competent');
    else caps.push('Novice');

    return caps;
}

export async function adaptStrategy(agentId: string, task: string): Promise<string> {
    const caps = getAgentCapabilities(agentId);
    if (caps.includes('Expert')) {
        return `As an Expert ${agentId}, assume autonomy and execute complex reasoning for: ${task}`;
    }
    return `As a developing ${agentId}, verify your steps carefully for: ${task}`;
}
