'use server';

import * as admin from 'firebase-admin';

// The singleton pattern is essential to prevent re-initialization errors
// in a Next.js hot-reloading environment.
if (!admin.apps.length) {
  // When deployed to Firebase App Hosting or Cloud Run, the Admin SDK
  // automatically discovers credentials. No manual configuration is needed.
  // For local development, you should use the Firebase Emulator Suite or
  // authenticate via the gcloud CLI: `gcloud auth application-default login`
  try {
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized with default credentials.');
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error);
    // Fallback for local environments that might not have default creds
    // This part should be customized based on local setup.
    // For this project, we assume default creds are available.
  }
}

export const firestoreAdmin = admin.firestore();
export { admin };
