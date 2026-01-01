import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { cert } from 'firebase-admin/app';

// This file is server-side only.

// Helper to safely load credentials or fall back to the environment's default credentials.
const getFirebaseCredential = () => {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

  if (privateKey && clientEmail && projectId) {
    try {
      // Fix for escaped newline characters in environment variables.
      const formattedKey = privateKey.replace(/\\n/g, '\n');
      return cert({
        projectId,
        clientEmail,
        privateKey: formattedKey,
      });
    } catch (error) {
      console.warn("⚠️  Could not parse FIREBASE_PRIVATE_KEY. Falling back to default credentials. Error:", error);
    }
  }

  // If private key is not available or parsing fails, 'undefined' will let the SDK
  // use the default credentials from the environment (ideal for App Hosting/Cloud Run).
  return undefined;
};

// Singleton Pattern: Initialize the app only if it hasn't been already.
// This is crucial for Next.js hot-reloading environments to avoid errors.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: getFirebaseCredential(),
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error("🔥 Firebase Admin SDK initialization failed:", error.message);
    // You could throw the error here to halt the app if Firebase is essential,
    // or handle it as needed. For now, we log it.
  }
}

// Export the initialized firestore instance and the admin namespace.
export const firestoreAdmin = admin.firestore();
export { admin };
