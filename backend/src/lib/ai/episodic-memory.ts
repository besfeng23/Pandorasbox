import { SearchResult } from '@/lib/types';

export interface TimelineEvent {
    description: string;
    timestamp: string;
    relevance: number;
}

/**
 * Reconstructs a chronological timeline from scattered memories.
 * Helps the AI understand the sequence of events and temporal context.
 */
export async function reconstructTimeline(memories: SearchResult[]): Promise<TimelineEvent[]> {
    try {
        // 1. Sort memories by timestamp
        const sorted = [...memories].sort((a, b) => {
            const dateA = new Date(a.timestamp).getTime();
            const dateB = new Date(b.timestamp).getTime();
            return dateA - dateB;
        });

        // 2. Map to timeline events
        return sorted.map(m => ({
            description: m.text,
            timestamp: m.timestamp,
            relevance: m.score
        }));

    } catch (error) {
        console.error('[EpisodicMemory] Error:', error);
        return [];
    }
}

/**
 * Generates a "Historical Narrative" from the timeline.
 */
export function generateNarrative(events: TimelineEvent[]): string {
    if (events.length === 0) return "No significant historical events recorded.";

    const narrative = events
        .map(e => `[${new Date(e.timestamp).toLocaleDateString()}] ${e.description}`)
        .join('\n');

    return `### HISTORICAL TIMELINE:\n${narrative}`;
}
