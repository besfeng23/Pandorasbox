
import 'server-only';
import admin from 'firebase-admin';

// Prevent multiple initializations in Next.js hot-reload
if (!admin.apps.length) {
  try {
    // 1. Check for a specific Environment Variable Key
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      // ⚠️ CRITICAL: Handle newline characters correctly in the Private Key
      // JSON.parse fails if newlines are not formatted perfectly
      let serviceAccount;
      try {
        serviceAccount = JSON.parse(serviceAccountKey);
      } catch (e) {
        // Retry by fixing escaped newlines (common issue in Vercel/Env vars)
        console.log("Parsing raw JSON failed, attempting to fix newlines...");
        serviceAccount = JSON.parse(serviceAccountKey.replace(/\\n/g, '\n'));
      }

      console.log("Initializing Firebase Admin with Service Account Key...");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });

    } else {
      // 2. Fallback: Automatic Google Cloud Discovery (App Hosting / Vercel / GCP)
      console.log("No Service Account Key found. Using Application Default Credentials.");
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }

  } catch (error) {
    console.error('❌ Firebase Admin Initialization Failed:', error);
    // Do not throw here, or the whole app crashes on startup.
    // Let specific actions fail individually if needed.
  }
}

export const firestoreAdmin = admin.firestore();
export const authAdmin = admin.auth();
