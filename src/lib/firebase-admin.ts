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
    // Directly require the service account file.
    // This bypasses all environment variable parsing issues.
    const serviceAccount = require('../../service-account.json');
    
    console.log("Initializing Firebase Admin with local service-account.json...");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });

  } catch (error) {
    console.error('❌ Firebase Admin Initialization Failed:', error);
    // Fallback for deployed environments where the file may not exist
    // and Application Default Credentials should be used.
    if (!admin.apps.length) {
        console.log("Local service account file not found or failed, trying Application Default Credentials.");
        admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
    }
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
