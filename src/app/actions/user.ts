'use server';

import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import * as Sentry from '@sentry/nextjs';

export async function updateSettings(formData: FormData) {
    const settingsData = {
        active_model: formData.get('active_model'),
        reply_style: formData.get('reply_style'),
        system_prompt_override: formData.get('system_prompt_override'),
    };
    const userId = formData.get('userId') as string;

    if (!userId) {
      return { success: false, message: 'User not authenticated.' };
    }
    const firestoreAdmin = getFirestoreAdmin();
    try {
        await firestoreAdmin.collection('settings').doc(userId).set(settingsData, { merge: true });
        revalidatePath('/settings');
        return { success: true, message: 'Settings updated successfully.' };
    } catch (error) {
        console.error('Error updating settings:', error);
        Sentry.captureException(error, { tags: { function: 'updateSettings', userId } });
        return { success: false, message: 'Failed to update settings.' };
    }
}

export async function generateUserApiKey(userId: string): Promise<{ success: boolean, apiKey?: string, message?: string }> {
    if (!userId) {
      return { success: false, message: 'User not authenticated.' };
    }
  
    const firestoreAdmin = getFirestoreAdmin();
    try {
      const apiKey = `sk-pandora-${randomBytes(24).toString('hex')}`;
      
      const settingsRef = firestoreAdmin.collection('settings').doc(userId);
      await settingsRef.set({ personal_api_key: apiKey }, { merge: true });
      
      revalidatePath('/settings');
      return { success: true, apiKey: apiKey };

    } catch (error) {
      console.error('Error generating API key:', error);
      Sentry.captureException(error, { tags: { function: 'generateUserApiKey', userId } });
      return { success: false, message: 'Failed to generate API key.' };
    }
}

/**
 * Exports all user data for GDPR compliance.
 * Returns a JSON object containing all user data from Firestore.
 */
export async function exportUserData(userId: string): Promise<{ success: boolean, data?: any, message?: string }> {
    if (!userId) {
        return { success: false, message: 'User not authenticated.' };
    }

    const firestoreAdmin = getFirestoreAdmin();
    try {
        const exportData: any = {
            userId,
            exportedAt: new Date().toISOString(),
            threads: [],
            messages: [],
            memories: [],
            artifacts: [],
            settings: null,
            userState: null,
        };

        // Export threads
        const threadsSnapshot = await firestoreAdmin
            .collection('threads')
            .where('userId', '==', userId)
            .get();
        exportData.threads = threadsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        }));

        // Export messages (history)
        const messagesSnapshot = await firestoreAdmin
            .collection('history')
            .where('userId', '==', userId)
            .get();
        exportData.messages = messagesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            // Remove embeddings for privacy/size
            embedding: undefined,
        }));

        // Export memories
        const memoriesSnapshot = await firestoreAdmin
            .collection('memories')
            .where('userId', '==', userId)
            .get();
        exportData.memories = memoriesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
            embedding: undefined,
        }));

        // Export artifacts
        const artifactsSnapshot = await firestoreAdmin
            .collection('artifacts')
            .where('userId', '==', userId)
            .get();
        exportData.artifacts = artifactsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
        }));

        // Export settings
        const settingsDoc = await firestoreAdmin.collection('settings').doc(userId).get();
        if (settingsDoc.exists) {
            const settingsData = settingsDoc.data();
            // Remove API key from export for security
            exportData.settings = {
                ...settingsData,
                personal_api_key: undefined,
            };
        }

        // Export user state
        const stateSnapshot = await firestoreAdmin
            .collection('users')
            .doc(userId)
            .collection('state')
            .get();
        exportData.userState = {};
        stateSnapshot.docs.forEach(doc => {
            exportData.userState[doc.id] = doc.data();
        });

        return { success: true, data: exportData };
    } catch (error) {
        console.error('Error exporting user data:', error);
        Sentry.captureException(error, { tags: { function: 'exportUserData', userId } });
        return { success: false, message: 'Failed to export user data.' };
    }
}

