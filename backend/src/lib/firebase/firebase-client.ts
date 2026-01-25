'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth as getFirebaseAuth, type Auth } from 'firebase/auth';
import { firebaseConfig, validateFirebaseConfig } from './firebase-config';

let firebaseApp: FirebaseApp | null = null;
let authInstance: Auth | null = null;

/**
 * Initialize Firebase Client App
 * @returns The initialized Firebase app instance
 */
function initializeFirebaseClient(): FirebaseApp {
  if (firebaseApp) {
    return firebaseApp;
  }

  // Check if app already exists
  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    return firebaseApp;
  }

  // Validate required configuration
  validateFirebaseConfig();

  // Initialize Firebase app
  firebaseApp = initializeApp(firebaseConfig);
  return firebaseApp;
}

/**
 * Get Firebase App instance
 * Initializes the app if it hasn't been initialized yet
 */
export function getFirebaseApp(): FirebaseApp {
  if (typeof window === 'undefined') {
    throw new Error('Firebase client SDK can only be used on the client side.');
  }
  return initializeFirebaseClient();
}

/**
 * Get Firebase Auth instance
 * Initializes the app and returns the auth instance
 */
export function getAuth(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth can only be used on the client side.');
  }

  if (authInstance) {
    return authInstance;
  }

  const app = getFirebaseApp();
  authInstance = getFirebaseAuth(app);
  return authInstance;
}

/**
 * Get Firebase App instance (exported for convenience)
 * @returns The initialized Firebase app instance
 */
export function getApp(): FirebaseApp {
  return getFirebaseApp();
}

/**
 * Get Firebase Auth instance (exported for convenience)
 * @returns The initialized Firebase Auth instance
 */
export function getAuthInstance(): Auth {
  return getAuth();
}

// Export the app and auth instances for direct access (if needed)
export { firebaseApp as app, authInstance as auth };

