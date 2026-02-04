import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface UserProfile {
    name?: string;
    role?: string;
    preferences?: string[];
    lastUpdated?: number;
}

/**
 * loads the user profile from Firestore.
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
    const db = getFirestoreAdmin();
    try {
        const doc = await db.doc(`users/${userId}/profile/data`).get();
        return doc.exists ? doc.data() as UserProfile : {};
    } catch (e) {
        console.error('Failed to load user profile:', e);
        return {};
    }
}

/**
 * Analyzes the latest user message to extract and persist profile information.
 * e.g. "My name is Joven" -> { name: "Joven" }
 */
export async function updateUserProfile(userId: string, message: string) {
    // 1. Quick heuristic to avoid unnecessary LLM calls
    const m = message.toLowerCase();
    const heuristics = ['my name is', 'call me', 'i am a', 'i prefer', 'i like', 'my role is', 'stupid fuck my name is'];

    if (!heuristics.some(h => m.includes(h))) return;

    // 2. LLM Extraction
    const prompt: ChatMessage[] = [
        {
            role: 'system',
            content: `Extract User Profile attributes from the message.
Return JSON ONLY.
Output Keys: name, role, preference.
If no info found, return empty JSON {}.
Example: "My name is Alice" -> {"name": "Alice"}
`
        },
        { role: 'user', content: message }
    ];

    try {
        const response = await completeInference(prompt, 0.1);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) return;

        const updates = JSON.parse(jsonMatch[0]);
        if (Object.keys(updates).length === 0) return;

        const db = getFirestoreAdmin();
        const docRef = db.doc(`users/${userId}/profile/data`);

        await db.runTransaction(async (t) => {
            const doc = await t.get(docRef);
            const current = doc.exists ? doc.data() as UserProfile : {};

            if (updates.name) current.name = updates.name;
            if (updates.role) current.role = updates.role;
            if (updates.preference) {
                current.preferences = [...(current.preferences || []), updates.preference];
            }
            current.lastUpdated = Date.now();
            t.set(docRef, current);
        });

        console.log(`[UserProfile] Updated for ${userId}:`, updates);

    } catch (e) {
        console.error('Failed to update user profile:', e);
    }
}
