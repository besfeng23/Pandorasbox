'use server';

import 'server-only';
import admin from 'firebase-admin';

let firestoreAdmin: admin.firestore.Firestore;
let authAdmin: admin.auth.Auth;

function initializeAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  // Check if we're in a build environment (service-account.json won't exist)
  // In production, use Application Default Credentials
  if (process.env.NODE_ENV === 'production' || !process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      console.log("Initializing Firebase Admin with Application Default Credentials...");
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      return;
    } catch (error) {
      console.error('Failed to initialize with Application Default Credentials:', error);
    }
  }

  // Try local service account file (for development)
  try {
    // Use dynamic import to avoid build-time errors if file doesn't exist
    const path = require('path');
    const fs = require('fs');
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      console.log("Initializing Firebase Admin with local service-account.json...");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } else {
      throw new Error('Service account file not found');
    }
  } catch (error) {
    console.warn('Local service account file not found, using Application Default Credentials.');
    // Fallback for deployed environments
    if (!admin.apps.length) {
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault()
        });
      } catch (fallbackError) {
        console.error('❌ Firebase Admin Initialization Failed:', fallbackError);
        throw new Error('Failed to initialize Firebase Admin. Please ensure service account is configured.');
      }
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
