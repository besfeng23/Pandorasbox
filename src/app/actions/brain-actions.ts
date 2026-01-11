'use server';

import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { getAuthAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { saveMemory } from '@/lib/memory-utils';
import { runReflectionFlow } from '@/ai/agents/nightly-reflection';
import { runDeepResearchBatch } from '@/ai/agents/deep-research';

type BrainActionResult = {
  success: boolean;
  message: string;
  details?: any;
};

/**
 * Seeds a core identity profile for the current user.
 * This writes a single memory with type `core_identity` so it can be prioritized in prompts.
 */
export async function seedIdentityProfile(userId: string | undefined | null): Promise<BrainActionResult> {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }

  const content = `
User Profile:

Name: Joven
Role: Full Stack Architect

Primary Stack:
- Next.js (App Router)
- TypeScript (strict, explicit types)
- Tailwind CSS (no external CSS files)

Coding Style:
- Prefer functional React components
- Prefer Server Components when possible
- Avoid unnecessary useEffect; use Server Components or server actions instead

Preferences:
- Concise responses
- Direct solutions, minimal fluff
- No placeholder code; provide realistic, production-quality patterns
`.trim();

  const result = await saveMemory({
    content,
    userId,
    source: 'brain_controls',
    // Extend type to core_identity via metadata for downstream usage
    type: 'normal',
    metadata: {
      type: 'core_identity',
      profileName: 'Joven Core Identity',
    },
  });

  if (!result.success) {
    return { success: false, message: result.message || 'Failed to save identity profile.' };
  }

  return {
    success: true,
    message: 'Core identity profile implanted into memory.',
    details: { memoryId: result.memory_id },
  };
}

/**
 * Manually triggers the nightly reflection flow for the current user.
 * Mirrors what the cron route does, but for a single user on demand.
 */
export async function triggerReflection(userId: string | undefined | null): Promise<BrainActionResult> {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }

  try {
    const result = await runReflectionFlow({ userId });

    return {
      success: true,
      message: 'Reflection completed successfully.',
      details: {
        insightsCount: result.insights.length,
        weakAnswer: result.weakAnswer,
        processedCount: result.processedCount,
      },
    };
  } catch (error: any) {
    console.error('[BrainActions] triggerReflection failed:', error);
    return {
      success: false,
      message: error?.message || 'Reflection failed.',
    };
  }
}

/**
 * Manually runs the Deep Research Agent to process the learning_queue.
 */
export async function triggerDeepResearch(userId: string | undefined | null): Promise<BrainActionResult> {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }

  try {
    // Optionally, we could scope by userId in the future; for now, this processes global queue
    const result = await runDeepResearchBatch();

    return {
      success: true,
      message: `Deep research completed. Processed ${result.processed} topic(s).`,
      details: result,
    };
  } catch (error: any) {
    console.error('[BrainActions] triggerDeepResearch failed:', error);
    return {
      success: false,
      message: error?.message || 'Deep research failed.',
    };
  }
}

/**
 * Token-verified wrappers (preferred). These enforce identity server-side like the other actions.
 */
async function getUserIdFromToken(idToken: string): Promise<string> {
  if (!idToken) {
    throw new Error('User not authenticated.');
  }
  const decoded = await getAuthAdmin().verifyIdToken(idToken);
  return decoded.uid;
}

export async function seedIdentityProfileAuthed(idToken: string): Promise<BrainActionResult> {
  const userId = await getUserIdFromToken(idToken);
  return seedIdentityProfile(userId);
}

export async function triggerReflectionAuthed(idToken: string): Promise<BrainActionResult> {
  const userId = await getUserIdFromToken(idToken);
  return triggerReflection(userId);
}

export async function triggerDeepResearchAuthed(idToken: string): Promise<BrainActionResult> {
  const userId = await getUserIdFromToken(idToken);
  return triggerDeepResearch(userId);
}


