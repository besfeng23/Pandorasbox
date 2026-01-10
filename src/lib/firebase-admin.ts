'use server';

// Only import server-only in Next.js context (not for standalone MCP server)
if (typeof process !== 'undefined' && process.env.NEXT_RUNTIME) {
  try {
    require('server-only');
  } catch {
    // Ignore if not in Next.js context
  }
}
import admin from 'firebase-admin';

let firestoreAdmin: admin.firestore.Firestore;
let authAdmin: admin.auth.Auth;

function initializeAdmin() {
  if (admin.apps.length > 0) {
    return;
  }

  // Highest priority: explicit service account path from FIREBASE_SERVICE_ACCOUNT_KEY
  // This is especially useful for standalone tools and MCP servers.
  try {
    // 1. Check for App Hosting / Cloud Run Env Vars (ADMIN_PRIVATE_KEY)
    if (process.env.ADMIN_PRIVATE_KEY && process.env.ADMIN_CLIENT_EMAIL) {
        console.log('Initializing Firebase Admin with ADMIN_PRIVATE_KEY env var...');
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'seismic-vista-480710-q5',
                clientEmail: process.env.ADMIN_CLIENT_EMAIL,
                privateKey: process.env.ADMIN_PRIVATE_KEY.replace(/\\n/g, '\n'),
            }),
        });
        return;
    }

    const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (serviceAccountEnv && serviceAccountEnv.trim()) {
      const path = require('path');
      const fs = require('fs');
      const serviceAccountPath = path.isAbsolute(serviceAccountEnv)
        ? serviceAccountEnv
        : path.join(process.cwd(), serviceAccountEnv);

      if (fs.existsSync(serviceAccountPath)) {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
        console.log('Initializing Firebase Admin with FIREBASE_SERVICE_ACCOUNT_KEY path...');
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        return;
      } else {
        console.warn(
          `FIREBASE_SERVICE_ACCOUNT_KEY path "${serviceAccountPath}" does not exist. Falling back to other credential strategies.`
        );
      }
    }
  } catch (error: any) {
    console.warn('Failed to initialize Firebase Admin from FIREBASE_SERVICE_ACCOUNT_KEY:', error.message);
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
    // Use fs.readFileSync instead of require to avoid Turbopack static analysis issues
    const path = require('path');
    const fs = require('fs');
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
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
