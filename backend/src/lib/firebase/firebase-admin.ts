import 'server-only';
import admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;
let adminAuth: admin.auth.Auth | null = null;
let adminFirestore: admin.firestore.Firestore | null = null;

/**
 * Initialize Firebase Admin SDK using service account credentials from environment variables
 * This function creates a singleton instance and handles private key encoding carefully
 */
function initializeAdminApp(): void {
  if (adminApp) {
    return; // Already initialized
  }

  // Check if app already exists (e.g., from another import)
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0]!;
    adminAuth = adminApp.auth();
    adminFirestore = adminApp.firestore();
    return;
  }

  // Validate required environment variables
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId) {
    throw new Error(
      'FIREBASE_PROJECT_ID environment variable is required. Please set it to your Firebase project ID.'
    );
  }

  if (!clientEmail) {
    throw new Error(
      'FIREBASE_CLIENT_EMAIL environment variable is required. Please set it to your Firebase service account client email.'
    );
  }

  if (!privateKey) {
    throw new Error(
      'FIREBASE_PRIVATE_KEY environment variable is required. Please set it to your Firebase service account private key.'
    );
  }

  try {
    // Handle private key encoding carefully
    // The private key may come with escaped newlines (\n) or actual newlines
    // Firebase Admin SDK expects the key with actual newlines
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');

    // Create service account credential object
    const serviceAccount: admin.ServiceAccount = {
      projectId,
      clientEmail,
      privateKey: formattedPrivateKey,
    };

    // Initialize Firebase Admin SDK
    adminApp = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      projectId,
    });

    // Initialize Auth and Firestore instances
    adminAuth = adminApp.auth();
    adminFirestore = adminApp.firestore();

    console.log(`[Firebase Admin] Successfully initialized for project: ${projectId}`);
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Firebase Admin] Initialization failed:', errorMessage);
    throw new Error(`Failed to initialize Firebase Admin SDK: ${errorMessage}`);
  }
}

/**
 * Get Firebase Admin App instance
 * Initializes the Admin SDK if it hasn't been initialized yet
 * @returns The Firebase Admin App instance
 */
export function getAdminApp(): admin.app.App {
  if (!adminApp) {
    initializeAdminApp();
  }

  if (!adminApp) {
    throw new Error('Firebase Admin App not initialized. Please check your configuration.');
  }

  return adminApp!; // Non-null assertion: we've checked above
}

/**
 * Get Firebase Admin Auth instance
 * Initializes the Admin SDK if it hasn't been initialized yet
 * @returns The Firebase Admin Auth instance for server-side token verification
 */
export function getAuthAdmin(): admin.auth.Auth {
  if (!adminAuth) {
    initializeAdminApp();
  }

  if (!adminAuth) {
    throw new Error('Firebase Admin Auth not initialized. Please check your configuration.');
  }

  return adminAuth!; // Non-null assertion: we've checked above
}

/**
 * Get Firebase Admin Firestore instance
 * Initializes the Admin SDK if it hasn't been initialized yet
 * @returns The Firebase Admin Firestore instance for server-side database operations
 */
export function getFirestoreAdmin(): admin.firestore.Firestore {
  if (!adminFirestore) {
    initializeAdminApp();
  }

  if (!adminFirestore) {
    throw new Error('Firebase Admin Firestore not initialized. Please check your configuration.');
  }

  return adminFirestore!; // Non-null assertion: we've checked above
}

