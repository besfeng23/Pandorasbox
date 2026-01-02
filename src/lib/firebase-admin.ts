import 'server-only';
import { initializeApp, getApps, getApp, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

// 1. SAFE INITIALIZATION
function getFirebaseAdminApp() {
  // If an app is already initialized, use that one (Prevents "App already exists" error)
  if (getApps().length > 0) {
    return getApp();
  }

  // Otherwise, create a new connection
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    try {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY) as ServiceAccount;
      return initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error) {
      console.error("❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", error);
    }
  }

  // Fallback for Cloud Hosting (uses internal identity)
  return initializeApp();
}

const app = getFirebaseAdminApp();

// 2. EXPORT FIRESTORE
export const firestoreAdmin = getFirestore(app);

// 3. SETTINGS REMOVED
// We removed the .settings() call because it crashes Next.js during development reloads.
// Firestore works perfectly fine with default settings.
