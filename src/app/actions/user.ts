'use server';

import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { revalidatePath } from 'next/cache';
import { randomBytes } from 'crypto';
import * as Sentry from '@sentry/nextjs';
import { sendKairosEvent } from '@/lib/kairosClient';

async function getUserIdFromToken(token: string): Promise<string> {
    try {
        const decoded = await getAuthAdmin().verifyIdToken(token);
        return decoded.uid;
    } catch (error) {
        console.error('Invalid ID token:', error);
        throw new Error('Invalid authentication token');
    }
}

export async function updateSettings(formData: FormData) {
    const idToken = formData.get('idToken') as string;
    
    if (!idToken) {
        return { success: false, message: 'User not authenticated.' };
    }

    try {
        const userId = await getUserIdFromToken(idToken);
        
        const settingsData = {
            active_model: formData.get('active_model'),
            reply_style: formData.get('reply_style'),
            system_prompt_override: formData.get('system_prompt_override'),
        };

        const firestoreAdmin = getFirestoreAdmin();
        await firestoreAdmin.collection('settings').doc(userId).set(settingsData, { merge: true });
        revalidatePath('/settings');
        
        // Emit Kairos event
        sendKairosEvent('ui.settings.updated', {
          userId,
          success: true,
        }).catch(err => console.warn('Failed to emit settings.updated event:', err));
        
        return { success: true, message: 'Settings updated successfully.' };
    } catch (error) {
        console.error('Error updating settings:', error);
        Sentry.captureException(error, { tags: { function: 'updateSettings' } });
        return { success: false, message: 'Failed to update settings.' };
    }
}

export async function generateUserApiKey(idToken: string): Promise<{ success: boolean, apiKey?: string, message?: string }> {
    if (!idToken) {
      return { success: false, message: 'User not authenticated.' };
    }
  
    try {
      const userId = await getUserIdFromToken(idToken);
      const firestoreAdmin = getFirestoreAdmin();
      const apiKey = `sk-pandora-${randomBytes(24).toString('hex')}`;
      
      const settingsRef = firestoreAdmin.collection('settings').doc(userId);
      await settingsRef.set({ personal_api_key: apiKey }, { merge: true });
      
      revalidatePath('/settings');
      
      // Emit Kairos event
      sendKairosEvent('system.apikey.generated', {
        userId,
        success: true,
      }).catch(err => console.warn('Failed to emit apikey.generated event:', err));
      
      return { success: true, apiKey: apiKey };

    } catch (error) {
      console.error('Error generating API key:', error);
      Sentry.captureException(error, { tags: { function: 'generateUserApiKey' } });
      return { success: false, message: 'Failed to generate API key.' };
    }
}

/**
 * Exports all user data for GDPR compliance.
 * Returns a JSON object containing all user data from Firestore.
 */
export async function exportUserData(idToken: string): Promise<{ success: boolean, data?: any, message?: string }> {
    if (!idToken) {
        return { success: false, message: 'User not authenticated.' };
    }

    try {
        const userId = await getUserIdFromToken(idToken);
        const firestoreAdmin = getFirestoreAdmin();
        
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

        // Calculate export size (approximate)
        const exportJson = JSON.stringify(exportData);
        const bytes = Buffer.byteLength(exportJson, 'utf8');

        // Emit Kairos event
        sendKairosEvent('system.export.completed', {
          userId,
          bytes,
          success: true,
          itemCounts: {
            threads: exportData.threads.length,
            messages: exportData.messages.length,
            memories: exportData.memories.length,
            artifacts: exportData.artifacts.length,
          },
        }).catch(err => console.warn('Failed to emit export.completed event:', err));

        return { success: true, data: exportData };
    } catch (error) {
        console.error('Error exporting user data:', error);
        Sentry.captureException(error, { tags: { function: 'exportUserData' } });
        return { success: false, message: 'Failed to export user data.' };
    }
}
