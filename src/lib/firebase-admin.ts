
import * as admin from 'firebase-admin';
import serviceAccount from '../../service-account.json';

// This will use the service account credentials from the imported json file.
// The singleton pattern (`if (!admin.apps.length)`) is essential to prevent
// re-initialization errors in a Next.js hot-reloading environment.

if (!admin.apps.length) {
  try {
    // Type assertion to ensure serviceAccount has the expected properties
    const typedServiceAccount = serviceAccount as {
      project_id: string;
      client_email: string;
      private_key: string;
    };

    if (
      !typedServiceAccount.project_id ||
      !typedServiceAccount.client_email ||
      !typedServiceAccount.private_key
    ) {
      throw new Error('Service account file is missing required fields.');
    }
    
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: typedServiceAccount.project_id,
        clientEmail: typedServiceAccount.client_email,
        privateKey: typedServiceAccount.private_key,
      }),
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
