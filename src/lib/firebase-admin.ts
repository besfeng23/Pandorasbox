
import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// This will use the service account credentials from the imported json file.
// The singleton pattern (`if (!admin.apps.length)`) is essential to prevent
// re-initialization errors in a Next.js hot-reloading environment.

if (!admin.apps.length) {
  try {
    const serviceAccountPath = path.resolve(process.cwd(), 'service-account.json');
    
    if (!fs.existsSync(serviceAccountPath)) {
        throw new Error('service-account.json not found at the root of the project.');
    }

    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

    if (
      !serviceAccount.project_id ||
      !serviceAccount.client_email ||
      !serviceAccount.private_key
    ) {
      throw new Error('Service account file is missing required fields.');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      // The storage bucket is needed for certain admin operations.
      // It's good practice to include it during initialization.
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error: any) {
    console.error('Firebase Admin SDK initialization error:', error.message);
    // Throwing the error here will make it clear during development
    // if the initialization is failing.
    throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
  }
}

export const firestoreAdmin = admin.firestore();
export { admin };
