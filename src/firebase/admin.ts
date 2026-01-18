import 'server-only';
import { cert, getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getAdminApp() {
  if (getApps().length > 0) {
    return getApp();
  }

  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountKey) {
    console.warn('⚠️ FIREBASE_SERVICE_ACCOUNT_KEY missing. Using mock app for build.');
    return initializeApp({ projectId: 'build-only-mock' }, 'build-mock');
  }

  try {
    return initializeApp({
      credential: cert(JSON.parse(serviceAccountKey)),
    });
  } catch (error) {
    console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', error);
    return initializeApp({ projectId: 'failed-init-mock' }, 'failed-init-mock');
  }
}

const app = getAdminApp();

export const adminDb = getFirestore(app);
