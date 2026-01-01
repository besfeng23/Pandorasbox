import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

// 1. robustCredentialHelper: Try to parse the key, but don't crash if it fails.
const getFirebaseCredential = () => {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (privateKey) {
    try {
      // Fix common formatting issues with newlines
      const formattedKey = privateKey.replace(/\\n/g, '\n');
      return cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      });
    } catch (error) {
      console.warn("⚠️ Private Key is malformed. Falling back to Default Credentials.", error);
    }
  }
  // If key is missing or broken, return undefined to use Google's Auto-Auth
  return undefined;
};


// The singleton pattern is essential to prevent re-initialization errors
// in a Next.js hot-reloading environment.
if (!admin.apps.length) {
  // When deployed to Firebase App Hosting or Cloud Run, the Admin SDK
  // automatically discovers credentials. No manual configuration is needed.
  // For local development, you should use the Firebase Emulator Suite or
  // authenticate via the gcloud CLI: `gcloud auth application-default login`
  try {
    admin.initializeApp({
        credential: getFirebaseCredential(),
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    });
    console.log('Firebase Admin SDK initialized.');
  } catch (error) {
    console.error("Firebase Admin SDK initialization error:", error);
  }
}

export const firestoreAdmin = admin.firestore();
export { admin };