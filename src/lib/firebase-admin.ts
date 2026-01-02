'use server';
import { initializeApp, getApps, getApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { admin } from 'firebase-admin';

// 1. SAFE INITIALIZATION
// This prevents the "App already exists" crash and the "No credentials" crash
function getFirebaseAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) {
    throw new Error('Firebase project ID is not defined in environment variables.');
  }

  // Check if we have a specific Private Key (Local Dev / Manual Setup)
  if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    try {
        const formattedKey = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');
        const credential = cert({
          projectId,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: formattedKey,
        });
        console.log('🚀 Initializing Firebase Admin with service account credentials.');
        return initializeApp({ credential, projectId });
    } catch (error) {
      console.error("❌ Failed to parse FIREBASE_PRIVATE_KEY:", error);
      // Fallback to default if parsing fails
    }
  }

  // Default: Use Google Cloud's built-in "Application Default Credentials"
  // This works automatically on App Hosting / Cloud Run
  console.log("🚀 Initializing Firebase Admin with Application Default Credentials.");
  return initializeApp({ projectId });
}

const app = getFirebaseAdminApp();

// 2. EXPORT FIRESTORE
// We export the db instance to be used everywhere
export const firestoreAdmin = getFirestore(app);

// Optional: specific settings to avoid gRPC errors in some environments
firestoreAdmin.settings({
  ignoreUndefinedProperties: true,
});

export { app as adminApp };
