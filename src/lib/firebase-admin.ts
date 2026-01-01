import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

// Helper to safely load credentials or fall back to auto-auth
const getFirebaseCredential = () => {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  
  if (privateKey) {
    try {
      // Fix newlines if they are escaped (common env var issue)
      const formattedKey = privateKey.replace(/\\n/g, '\n');
      return cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: formattedKey,
      });
    } catch (error) {
      console.warn("⚠️ Private Key is malformed. Switching to Default Credentials.", error);
    }
  }
  // Returning undefined forces Firebase to use Cloud Run's auto-login
  return undefined;
};

// The singleton pattern is essential to prevent re-initialization errors
// in a Next.js hot-reloading environment.
if (!admin.apps.length) {
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
