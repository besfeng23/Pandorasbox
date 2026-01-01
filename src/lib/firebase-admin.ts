import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { cert } from 'firebase-admin/app';

// This file is server-side only.

// Singleton Pattern: Initialize the app only if it hasn't been already.
// This is crucial for Next.js hot-reloading environments to avoid errors.
if (!admin.apps.length) {
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
      throw new Error('Firebase project ID is not defined in environment variables.');
    }
    
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

    let credential;
    if (privateKey && clientEmail) {
      try {
        const formattedKey = privateKey.replace(/\\n/g, '\n');
        credential = cert({
          projectId,
          clientEmail,
          privateKey: formattedKey,
        });
      } catch (e) {
        console.warn("⚠️  Could not parse FIREBASE_PRIVATE_KEY. Falling back to default credentials.", e);
        credential = admin.credential.applicationDefault();
      }
    } else {
        console.log("🚀 Initializing Firebase Admin with Application Default Credentials.");
        credential = admin.credential.applicationDefault();
    }
    
    admin.initializeApp({
      credential,
      projectId,
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error("🔥 Firebase Admin SDK initialization failed:", error.message);
    // Throwing the error here will halt the app if Firebase is essential,
    // which is useful for debugging configuration issues.
    // In a production scenario, you might handle this differently.
  }
}

// Export the initialized firestore instance and the admin namespace.
export const firestoreAdmin = getFirestore();
export { admin };
