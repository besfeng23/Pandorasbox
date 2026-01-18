import 'server-only';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (getApps().length === 0) {
  if (!serviceAccountKey) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_KEY is not configured.');
  }

  initializeApp({
    credential: cert(JSON.parse(serviceAccountKey)),
  });
}

export const adminDb = getFirestore();
