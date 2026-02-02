import { ChatMessage } from '@/lib/sovereign/inference';

export interface FeedbackSignal {
    userId: string;
    messageId: string;
    isPositive: boolean;
    comment?: string;
}

/**
 * Learns from user feedback to improve the system prompts and agent behavior.
 * This is the "Brain's" self-correction mechanism.
 */
export class MetaLearningEngine {
    /**
     * Analyzes an interaction and generates a "Lesson Learnt" summary.
     */
    async crystallizeLesson(messages: ChatMessage[], feedback: FeedbackSignal): Promise<string> {
        if (!feedback.isPositive) {
            return `User flagged this interaction. ISSUE: ${feedback.comment || "Unexpected behavior"}. Context: ${messages.slice(-2).map(m => m.content).join(' -> ')}`;
        }
        return "Positive signal received. Maintaining current strategy.";
    }

    /**
     * Refines the system prompt based on lessons learned.
     */
    refinePrompt(basePrompt: string, lessons: string[]): string {
        if (lessons.length === 0) return basePrompt;

        const insights = lessons
            .filter(l => !l.includes("Positive signal"))
            .slice(-3)
            .map(l => `- ${l}`)
            .join('\n');

        if (!insights) return basePrompt;

        return `${basePrompt}\n\n### 🎓 LESSONS LEARNED FROM PAST ERRORS:\n${insights}\n**Instruction**: Avoid these specific mistakes in future responses.`;
    }
}

export const metaLearner = new MetaLearningEngine();
