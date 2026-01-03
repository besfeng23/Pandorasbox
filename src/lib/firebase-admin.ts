
import 'server-only';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  try {
    // Attempt to initialize with service account from environment variable
    const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT!);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e) {
    console.log('Admin SDK init failed with service account, trying default credentials...');
    // Fallback for deployed environments (like App Hosting)
    admin.initializeApp();
  }
}

export const firestoreAdmin = admin.firestore();
export const authAdmin = admin.auth();
