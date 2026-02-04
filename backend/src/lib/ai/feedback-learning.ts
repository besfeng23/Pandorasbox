import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { trackPerformance } from './agent-learning';

export interface UserFeedback {
    threadId: string;
    messageId: string;
    score: number; // -1 (bad) to 1 (good)
    comment?: string;
    agentId: string;
}

/**
 * Records user feedback and triggers RLHF-lite loops (Updating Agent Learning).
 */
export async function submitFeedback(feedback: UserFeedback) {
    const db = getFirestoreAdmin();

    try {
        // 1. Save Feedback
        await db.collection(`users/${feedback.threadId}/feedback`).add({
            ...feedback,
            createdAt: Date.now()
        });

        // 2. Adjust Agent Performance Score
        // If feedback is positive, success=true.
        // If feedback is negative, success=false.
        const success = feedback.score > 0;

        // Impact factor: User feedback is high signal (weight 5.0 vs normal 1.0)
        await trackPerformance(feedback.agentId, success, success ? 5.0 : 0.0);

        console.log(`[Feedback] Recorded score ${feedback.score} for ${feedback.agentId}`);

    } catch (error) {
        console.error('Failed to submit feedback:', error);
    }
}
