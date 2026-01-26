'use server';

import 'server-only';
import admin from 'firebase-admin';

/**
 * Global type declaration for Next.js hot-reload support
 * This ensures the singleton instance persists across hot-reloads
 */
declare global {
  // eslint-disable-next-line no-var
  var __firebaseAdminApp: admin.app.App | undefined;
}

/**
 * Initialize Firebase Admin SDK using service account credentials
 * This function creates a singleton instance using globalThis to prevent
 * re-initialization warnings during Next.js hot-reload
 * 
 * Configuration:
 * Uses FIREBASE_SERVICE_ACCOUNT environment variable which holds the raw JSON string
 * of the service account key. This is parsed to initialize the application credentials.
 */
function initializeAdminApp(): admin.app.App {
  // Check globalThis first (for Next.js hot-reload support)
  if (globalThis.__firebaseAdminApp) {
    return globalThis.__firebaseAdminApp;
  }

  // Check if app already exists (e.g., from another import)
  if (admin.apps.length > 0) {
    const existingApp = admin.apps[0]!;
    globalThis.__firebaseAdminApp = existingApp;
    return existingApp;
  }

  let credential: admin.credential.Credential;
  let projectId: string;

  // Use FIREBASE_SERVICE_ACCOUNT (raw JSON string)
  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (!serviceAccount) {
    throw new Error(
      'FIREBASE_SERVICE_ACCOUNT environment variable is required. Please set it to the raw JSON string of your Firebase service account key.'
    );
  }

  try {
    const serviceAccountJson = JSON.parse(serviceAccount);
    credential = admin.credential.cert(serviceAccountJson);
    projectId = serviceAccountJson.project_id;
    
    if (!projectId) {
      throw new Error('Service account JSON is missing project_id field');
    }
  } catch (error: any) {
    throw new Error(
      `Failed to parse FIREBASE_SERVICE_ACCOUNT: ${error.message}. Please ensure it is valid JSON.`
    );
  }

  try {
    // Initialize Firebase Admin SDK
    const app = admin.initializeApp({
      credential,
      projectId,
    });

    // Store in globalThis for Next.js hot-reload persistence
    globalThis.__firebaseAdminApp = app;

    console.log(`[Firebase Admin] Successfully initialized for project: ${projectId}`);
    
    return app;
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Firebase Admin] Initialization failed:', errorMessage);
    throw new Error(`Failed to initialize Firebase Admin SDK: ${errorMessage}`);
  }
}

/**
 * Get Firebase Admin App instance
 * Initializes the Admin SDK if it hasn't been initialized yet
 * This is the primary exported function for accessing the Admin SDK
 * 
 * @returns The Firebase Admin App instance
 * @throws Error if initialization fails or if called on client-side
 * 
 * @example
 * ```ts
 * import { getAdminApp } from '@/lib/firebase/firebase-admin';
 * 
 * // In an API route or Server Action
 * const app = getAdminApp();
 * const auth = app.auth();
 * const firestore = app.firestore();
 * ```
 */
export function getAdminApp(): admin.app.App {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error(
      'Firebase Admin can only be used on the server side. This function must be called from API routes or Server Actions.'
    );
  }

  return initializeAdminApp();
}
