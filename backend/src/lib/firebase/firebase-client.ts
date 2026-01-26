'use client';

import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';

/**
 * Firebase Client Configuration
 * Uses Next.js public environment variables (NEXT_PUBLIC_*) which are
 * automatically injected at build time and are safe for client-side use
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

/**
 * Validate that required Firebase configuration values are present
 * @throws Error if required configuration is missing
 */
function validateFirebaseConfig(): void {
  const required = [
    { key: 'NEXT_PUBLIC_FIREBASE_API_KEY', value: firebaseConfig.apiKey },
    { key: 'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', value: firebaseConfig.authDomain },
    { key: 'NEXT_PUBLIC_FIREBASE_PROJECT_ID', value: firebaseConfig.projectId },
  ];

  for (const { key, value } of required) {
    if (!value) {
      throw new Error(
        `${key} environment variable is required. Please set it in your .env.local file.`
      );
    }
  }
}

/**
 * Initialize Firebase Client App
 * Uses singleton pattern with getApps().length === 0 check to avoid
 * re-initialization errors in strict mode/development
 * @returns The initialized Firebase app instance
 */
function initializeFirebaseClient(): FirebaseApp {
  // Check if app already exists (standard pattern to avoid re-initialization)
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  // Validate required configuration
  validateFirebaseConfig();

  // Initialize Firebase app
  const app = initializeApp(firebaseConfig);
  
  console.log('[Firebase Client] Successfully initialized Firebase app');
  
  return app;
}

/**
 * Exported Firebase App instance
 * This is a singleton that is initialized on first import
 * Uses the standard getApps().length === 0 pattern to prevent re-initialization
 * Safe for browser execution - relies on Next.js public env injection
 * 
 * @example
 * ```ts
 * import { app } from '@/lib/firebase/firebase-client';
 * 
 * // Use the app instance directly
 * console.log(app.name);
 * ```
 */
export const app: FirebaseApp = initializeFirebaseClient();

/**
 * Exported Firebase Auth instance
 * This is a singleton that is initialized on first import
 * Ready for use throughout the client application
 * Safe for browser execution
 * 
 * @example
 * ```ts
 * import { auth } from '@/lib/firebase/firebase-client';
 * 
 * // Use the auth instance directly
 * const user = auth.currentUser;
 * ```
 */
export const auth: Auth = getAuth(app);
