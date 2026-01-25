'use client';

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth as getFirebaseAuth, type Auth } from 'firebase/auth';

/**
 * Firebase Client SDK Configuration
 * Initializes Firebase client app using environment variables
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
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId) {
    throw new Error(
      'Firebase configuration is incomplete. Please ensure NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID are set.'
    );
  }

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

// Export the app and auth for convenience
export { firebaseApp, authInstance };

