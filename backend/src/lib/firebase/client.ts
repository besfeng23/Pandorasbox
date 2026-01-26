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
 * Get Firebase Client App instance
 * Ensures the Firebase Client SDK is initialized exactly once
 * Uses getApps() to check for existing apps before initializing
 * 
 * @returns The initialized Firebase app instance
 * @throws Error if required configuration is missing
 * 
 * @example
 * ```ts
 * import { getFirebaseClientApp } from '@/lib/firebase/client';
 * 
 * const app = getFirebaseClientApp();
 * ```
 */
export function getFirebaseClientApp(): FirebaseApp {
  // Check if app already exists (standard pattern to avoid re-initialization)
  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  // Validate required configuration
  validateFirebaseConfig();

  // Initialize Firebase app
  const app = initializeApp(firebaseConfig);
  
  console.log('[Firebase Client] Successfully initialized Firebase app');
  
  return app;
}

/**
 * Get Firebase Auth instance
 * Convenience function to access the Auth service
 * 
 * @returns The Firebase Auth instance
 * @throws Error if initialization fails
 * 
 * @example
 * ```ts
 * import { getFirebaseAuth } from '@/lib/firebase/client';
 * 
 * const auth = getFirebaseAuth();
 * const user = auth.currentUser;
 * ```
 */
export function getFirebaseAuth(): Auth {
  const app = getFirebaseClientApp();
  return getAuth(app);
}

