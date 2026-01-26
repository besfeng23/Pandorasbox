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
 * Uses FIREBASE_ADMIN_CREDENTIALS environment variable which holds the raw JSON string
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

  // Use FIREBASE_ADMIN_CREDENTIALS (raw JSON string)
  const credentialsJson = process.env.FIREBASE_ADMIN_CREDENTIALS;
  
  if (!credentialsJson) {
    throw new Error(
      'FIREBASE_ADMIN_CREDENTIALS environment variable is required. Please set it to the raw JSON string of your Firebase service account key.'
    );
  }

  try {
    const serviceAccountJson = JSON.parse(credentialsJson);
    credential = admin.credential.cert(serviceAccountJson);
    projectId = serviceAccountJson.project_id;
    
    if (!projectId) {
      throw new Error('Service account JSON is missing project_id field');
    }
  } catch (error: any) {
    throw new Error(
      `Failed to parse FIREBASE_ADMIN_CREDENTIALS: ${error.message}. Please ensure it is valid JSON.`
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
 * import { getFirebaseAdminApp } from '@/lib/firebase/admin';
 * 
 * // In an API route or Server Action
 * const app = getFirebaseAdminApp();
 * const auth = app.auth();
 * const firestore = app.firestore();
 * ```
 */
export function getFirebaseAdminApp(): admin.app.App {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error(
      'Firebase Admin can only be used on the server side. This function must be called from API routes or Server Actions.'
    );
  }

  return initializeAdminApp();
}

/**
 * Get Firebase Auth instance
 * Convenience function to access the Auth service
 * 
 * @returns The Firebase Admin Auth instance
 * @throws Error if initialization fails or if called on client-side
 * 
 * @example
 * ```ts
 * import { getFirebaseAuth } from '@/lib/firebase/admin';
 * 
 * const auth = getFirebaseAuth();
 * const user = await auth.getUser(uid);
 * ```
 */
export function getFirebaseAuth(): admin.auth.Auth {
  return getFirebaseAdminApp().auth();
}

/**
 * Get Firestore instance
 * Convenience function to access the Firestore service
 * 
 * @returns The Firebase Admin Firestore instance
 * @throws Error if initialization fails or if called on client-side
 * 
 * @example
 * ```ts
 * import { getFirestore } from '@/lib/firebase/admin';
 * 
 * const db = getFirestore();
 * const doc = await db.collection('users').doc(uid).get();
 * ```
 */
export function getFirestore(): admin.firestore.Firestore {
  return getFirebaseAdminApp().firestore();
}

/**
 * Exported Firebase Admin App instance
 * This is a singleton that is initialized on first import
 * Uses the standard singleton pattern for optimal performance
 * Ready for use in Next.js API routes or Server Actions
 * 
 * @example
 * ```ts
 * import { firebaseAdminApp, getFirebaseAuth, getFirestore } from '@/lib/firebase/admin';
 * 
 * // Direct access to app
 * const app = firebaseAdminApp;
 * 
 * // Or use convenience functions
 * const auth = getFirebaseAuth();
 * const db = getFirestore();
 * ```
 */
export const firebaseAdminApp: admin.app.App = (() => {
  // Prevent client-side usage
  if (typeof window !== 'undefined') {
    throw new Error(
      'Firebase Admin can only be used on the server side. This must be imported in API routes or Server Actions.'
    );
  }

  return initializeAdminApp();
})();

// Re-export commonly used admin functions for convenience
export { admin };

