'use client';

/**
 * Firebase Client Configuration Constants
 * Defines the client-side Firebase configuration object using environment variables
 * 
 * These values are safe to expose to the client as they are public configuration
 * required for Firebase client SDK initialization.
 */
export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
} as const;

/**
 * Validate that required Firebase configuration values are present
 * @throws Error if required configuration is missing
 */
export function validateFirebaseConfig(): void {
  if (!firebaseConfig.apiKey) {
    throw new Error(
      'NEXT_PUBLIC_FIREBASE_API_KEY environment variable is required. Please set it in your .env.local file.'
    );
  }

  if (!firebaseConfig.authDomain) {
    throw new Error(
      'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN environment variable is required. Please set it in your .env.local file.'
    );
  }

  if (!firebaseConfig.projectId) {
    throw new Error(
      'NEXT_PUBLIC_FIREBASE_PROJECT_ID environment variable is required. Please set it in your .env.local file.'
    );
  }
}

