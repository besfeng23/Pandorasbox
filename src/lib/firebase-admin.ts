
'use server';

import 'server-only';
import admin from 'firebase-admin';

let firestoreAdmin: admin.firestore.Firestore;
let authAdmin: admin.auth.Auth;

function initializeAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  try {
    const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (serviceAccountKey) {
      const serviceAccount = JSON.parse(serviceAccountKey);
      console.log("Initializing Firebase Admin with Service Account Key...");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      console.log("No Service Account Key found. Using Application Default Credentials.");
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    }
  } catch (error) {
    console.error('❌ Firebase Admin Initialization Failed:', error);
    // Re-throw the error so it's not silent
    throw error;
  }
}


// Use a getter to ensure the app is initialized before accessing services
function getFirestoreAdmin() {
  initializeAdmin();
  if (!firestoreAdmin) {
    firestoreAdmin = admin.firestore();
  }
  return firestoreAdmin;
}

function getAuthAdmin() {
    initializeAdmin();
    if (!authAdmin) {
        authAdmin = admin.auth();
    }
    return authAdmin;
}

// Export the getter functions
export { getFirestoreAdmin, getAuthAdmin };
