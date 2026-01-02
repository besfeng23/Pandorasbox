import 'server-only';
import admin from 'firebase-admin';

// Check if firebase is already initialized to prevent "already exists" errors
if (!admin.apps.length) {
  // ⚠️ LOOK: No arguments! No JSON file! 
  // Google automatically finds the credentials on App Hosting.
  admin.initializeApp(); 
}

export const firestoreAdmin = admin.firestore();
export const authAdmin = admin.auth();
