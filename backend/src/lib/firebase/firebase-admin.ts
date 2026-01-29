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
  if (globalThis.__firebaseAdminApp) {
    return globalThis.__firebaseAdminApp;
  }

  if (admin.apps.length > 0) {
    const existingApp = admin.apps[0]!;
    globalThis.__firebaseAdminApp = existingApp;
    return existingApp;
  }

  // 1. Try FIREBASE_SERVICE_ACCOUNT_KEY (Standard for this project)
  // 2. Try FIREBASE_SERVICE_ACCOUNT (Legacy support)
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY || process.env.FIREBASE_SERVICE_ACCOUNT;
  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  try {
    let credential: admin.credential.Credential | undefined;

    // A. Parse Service Account if available
    if (serviceAccountEnv && serviceAccountEnv.trim()) {
      try {
        if (serviceAccountEnv.trim().startsWith('{')) {
          const json = JSON.parse(serviceAccountEnv);
          credential = admin.credential.cert(json);
        } else {
          // Path based (local dev)
          const path = require('path');
          const fs = require('fs');
          const fullPath = path.isAbsolute(serviceAccountEnv)
            ? serviceAccountEnv
            : path.join(process.cwd(), serviceAccountEnv);
          if (fs.existsSync(fullPath)) {
            credential = admin.credential.cert(fullPath);
          }
        }
      } catch (parseError) {
        console.warn('[Firebase Admin] Failed to parse service account key:', parseError);
      }
    }

    // B. Fallback to ADC (Application Default Credentials) - Preferred for Cloud Run
    if (!credential) {
      console.log('[Firebase Admin] Service account key not found/valid. Using Application Default Credentials (ADC).');
      credential = admin.credential.applicationDefault();
    }

    // Initialize
    const app = admin.initializeApp({
      credential,
      projectId: projectId || undefined
    });

    globalThis.__firebaseAdminApp = app;
    console.log(`[Firebase Admin] Successfully initialized (Project: ${projectId || 'ADC-Inferred'})`);

    return app;

  } catch (error: any) {
    console.error('[Firebase Admin] Critical Initialization Failure:', error);

    // Last resort: Mock app for build time or extreme failure specific naming prevents conflict
    // But middleware might fail if we return a mock. 
    // Better to rethrow if we truly can't start, BUT middleware crashing is bad.
    // However, if we can't verify cookies, we SHOULD probably error or deny access.
    throw new Error(`Failed to initialize Firebase Admin SDK: ${error.message}`);
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
