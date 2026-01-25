'use server';

import admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;
let adminAuth: admin.auth.Auth | null = null;

/**
 * Initialize Firebase Admin SDK
 * Loads credentials from environment variables or service account file
 */
function initializeAdmin(): void {
  if (adminApp) {
    return; // Already initialized
  }

  // Check if app already exists
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0];
    adminAuth = adminApp.auth();
    return;
  }

  // Priority 1: FIREBASE_SERVICE_ACCOUNT (JSON string or path)
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (serviceAccountEnv) {
    try {
      let serviceAccount: admin.ServiceAccount;

      // Try to parse as JSON first
      if (serviceAccountEnv.trim().startsWith('{')) {
        serviceAccount = JSON.parse(serviceAccountEnv);
      } else {
        // Treat as file path
        const path = require('path');
        const fs = require('fs');
        const serviceAccountPath = path.isAbsolute(serviceAccountEnv)
          ? serviceAccountEnv
          : path.join(process.cwd(), serviceAccountEnv);

        if (fs.existsSync(serviceAccountPath)) {
          serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
        } else {
          throw new Error(`Service account file not found: ${serviceAccountPath}`);
        }
      }

      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      adminAuth = adminApp.auth();
      console.log('[Firebase Admin] Initialized with service account credentials.');
      return;
    } catch (error: any) {
      console.error('[Firebase Admin] Failed to initialize with service account:', error.message);
      // Continue to fallback methods
    }
  }

  // Priority 2: Application Default Credentials (for Cloud Run, GCE, etc.)
  try {
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;
    
    if (projectId) {
      adminApp = admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: projectId,
      });
      adminAuth = adminApp.auth();
      console.log('[Firebase Admin] Initialized with Application Default Credentials.');
      return;
    }
  } catch (error: any) {
    console.warn('[Firebase Admin] Application Default Credentials not available:', error.message);
    // Continue to fallback
  }

  // Priority 3: Local service-account.json file (development only)
  try {
    const path = require('path');
    const fs = require('fs');
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      adminAuth = adminApp.auth();
      console.log('[Firebase Admin] Initialized with local service-account.json.');
      return;
    }
  } catch (error: any) {
    // File doesn't exist or can't be loaded
    console.warn('[Firebase Admin] Local service account not found:', error.message);
  }

  // If we reach here, initialization failed
  throw new Error(
    'Firebase Admin SDK initialization failed. Please provide FIREBASE_SERVICE_ACCOUNT, FIREBASE_PROJECT_ID with ADC, or service-account.json file.'
  );
}

/**
 * Get Firebase Admin Auth instance
 * Initializes the Admin SDK if it hasn't been initialized yet
 * @returns The Firebase Admin Auth instance for server-side token verification
 */
export function getAuthAdmin(): admin.auth.Auth {
  if (!adminAuth) {
    initializeAdmin();
  }

  if (!adminAuth) {
    throw new Error('Firebase Admin Auth not initialized. Please check your configuration.');
  }

  return adminAuth;
}

/**
 * Get Firebase Admin App instance
 * @returns The Firebase Admin App instance
 */
export function getAdminApp(): admin.app.App {
  if (!adminApp) {
    initializeAdmin();
  }

  if (!adminApp) {
    throw new Error('Firebase Admin App not initialized. Please check your configuration.');
  }

  return adminApp;
}

