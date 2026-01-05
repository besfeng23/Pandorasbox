'use server';

import 'server-only';
import admin from 'firebase-admin';

let firestoreAdmin: admin.firestore.Firestore;
let authAdmin: admin.auth.Auth;

function initializeAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  // In production/build environments, always use Application Default Credentials
  // The service-account.json file won't exist in the build container
  if (process.env.NODE_ENV === 'production' || process.env.VERCEL || process.env.FIREBASE_CONFIG) {
    try {
      console.log("Initializing Firebase Admin with Application Default Credentials...");
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
      return;
    } catch (error: any) {
      // During build, this might fail but that's okay - it will work at runtime
      if (error.message?.includes('Could not load the default credentials')) {
        console.warn('Application Default Credentials not available during build. Will use at runtime.');
        return;
      }
      console.error('Failed to initialize with Application Default Credentials:', error);
    }
  }

  // Try local service account file (for local development only)
  try {
    // Use dynamic require with try-catch to avoid build-time errors
    const path = require('path');
    const fs = require('fs');
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = require(serviceAccountPath);
      console.log("Initializing Firebase Admin with local service-account.json...");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      return;
    }
  } catch (error: any) {
    // File doesn't exist or can't be loaded - that's fine, use ADC
    if (error.code !== 'MODULE_NOT_FOUND' && !error.message?.includes('Cannot find module')) {
      console.warn('Could not load local service account:', error.message);
    }
  }
  
  // Final fallback: Use Application Default Credentials
  if (!admin.apps.length) {
    try {
      console.log("Initializing Firebase Admin with Application Default Credentials (fallback)...");
      admin.initializeApp({
        credential: admin.credential.applicationDefault()
      });
    } catch (fallbackError: any) {
      // During build, don't throw - this will work at runtime with proper credentials
      if (fallbackError.message?.includes('Could not load the default credentials')) {
        console.warn('Firebase Admin will be initialized at runtime with Application Default Credentials.');
        return;
      }
      console.error('❌ Firebase Admin Initialization Failed:', fallbackError);
      // Only throw in development - in production builds, let it fail gracefully
      if (process.env.NODE_ENV !== 'production') {
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
