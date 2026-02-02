import { Memory, SearchResult } from '@/lib/types';

export interface ContextWindow {
    shortTerm: string[]; // Last N messages
    working: string[]; // Dynamically recalled facts
    longTerm: string; // Highly compressed historical context
}

/**
 * Manages the transition of data between different memory tiers.
 * Prevents "Context Drowning" by selectively compressing and pruning data.
 */
export class MemoryHierarchy {
    private maxTokens = 4000;

    /**
     * Constructs a balanced context window from available memory sources.
     */
    async optimizeContext(
        history: any[],
        recalledMemories: SearchResult[]
    ): Promise<string> {
        // 1. Short-term: Keep last 3 exchanges raw
        const shortTerm = history.slice(-6).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n');

        // 2. Working: Extract high-confidence facts from RAG
        const working = recalledMemories
            .filter(m => m.score > 0.7)
            .map(m => `- ${m.text}`)
            .join('\n');

        // 3. Long-term: Summarized history (placeholder for compression logic)
        const longTerm = history.length > 6
            ? `\n### DISTANT HISTORY (PREVIOUS CONTEXT):\n[User has previously discussed projects involving ${this.extractThemes(history)}]`
            : "";

        return `RAW CHAT HISTORY:\n${shortTerm}\n\nRELEVANT FACTS:\n${working}${longTerm}`;
    }

    private extractThemes(history: any[]): string {
        // Simple heuristic for now: extract capitalized words as themes
        const text = history.slice(0, -6).map(m => m.content).join(' ');
        const matches = text.match(/[A-Z][a-z]+/g) || [];
        return Array.from(new Set(matches)).slice(0, 5).join(', ');
    }
}

export const memoryController = new MemoryHierarchy();
