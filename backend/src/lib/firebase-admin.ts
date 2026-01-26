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
    // Already initialized, skip
    return;
  }
  
  console.log('[Firebase Admin] Attempting to initialize Firebase Admin SDK...');
  console.log('[Firebase Admin] Environment check:', {
    hasServiceAccountKey: !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY,
    hasFirebaseConfig: !!process.env.FIREBASE_CONFIG,
    hasFirebaseProjectId: !!process.env.FIREBASE_PROJECT_ID,
    hasNextPublicProjectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    nodeEnv: process.env.NODE_ENV,
    nextPhase: process.env.NEXT_PHASE
  });

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!serviceAccountEnv && process.env.NEXT_PHASE === 'phase-production-build') {
    console.warn('⚠️ [Firebase Admin] FIREBASE_SERVICE_ACCOUNT_KEY missing during build. Using mock Firebase Admin app.');
    admin.initializeApp({ projectId: 'build-mock' }, 'build-mock');
    return;
  }

  // Highest priority: FIREBASE_SERVICE_ACCOUNT_KEY (JSON string or path)
  try {
    if (serviceAccountEnv && serviceAccountEnv.trim()) {
      let serviceAccount;
      
      // Try to parse as JSON first
      if (serviceAccountEnv.trim().startsWith('{')) {
        console.log('[Firebase Admin] Initializing Firebase Admin with FIREBASE_SERVICE_ACCOUNT_KEY JSON string...');
        serviceAccount = JSON.parse(serviceAccountEnv);
      } else {
        // Otherwise treat as a path
        const path = require('path');
        const fs = require('fs');
        const serviceAccountPath = path.isAbsolute(serviceAccountEnv)
          ? serviceAccountEnv
          : path.join(process.cwd(), serviceAccountEnv);

        if (fs.existsSync(serviceAccountPath)) {
          console.log('[Firebase Admin] Initializing Firebase Admin with FIREBASE_SERVICE_ACCOUNT_KEY path...');
          serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
        }
      }

      if (serviceAccount) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
        console.log('[Firebase Admin] Successfully initialized with service account key.');
        return;
      }
    }
  } catch (error: any) {
    console.warn('[Firebase Admin] Failed to initialize Firebase Admin from FIREBASE_SERVICE_ACCOUNT_KEY:', error.message);
  }

  // Fallback to FIREBASE_CONFIG or FIREBASE_PROJECT_ID with ADC
  // In Cloud Run, we should always try ADC if service account key is not available
  if (!admin.apps.length) {
    try {
      let projectId = process.env.FIREBASE_PROJECT_ID;
      
      // Parse FIREBASE_CONFIG if projectId is missing
      if (!projectId && process.env.FIREBASE_CONFIG) {
        try {
          const config = JSON.parse(process.env.FIREBASE_CONFIG);
          projectId = config.projectId;
        } catch (parseError) {
          console.warn('[Firebase Admin] Failed to parse FIREBASE_CONFIG:', parseError);
        }
      }

      // Also try NEXT_PUBLIC_FIREBASE_PROJECT_ID as a fallback
      if (!projectId) {
        projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      }

      if (projectId) {
        console.log(`[Firebase Admin] Attempting to initialize Firebase Admin with ADC for project: ${projectId}`);
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          projectId: projectId
        });
        console.log('[Firebase Admin] Successfully initialized with Application Default Credentials.');
        return;
      } else {
        console.warn('[Firebase Admin] No project ID found. Checked FIREBASE_PROJECT_ID, FIREBASE_CONFIG, and NEXT_PUBLIC_FIREBASE_PROJECT_ID');
      }
    } catch (error: any) {
      // During build, this might fail but that's okay - it will work at runtime
      if (error.message?.includes('Could not load the default credentials')) {
        console.warn('[Firebase Admin] Application Default Credentials not available. Will try other methods.');
      } else {
        console.warn('[Firebase Admin] Failed to initialize with ADC:', error.message || error);
      }
    }
  }

  // Try local service account file (for local development only)
  try {
    // Use dynamic require with try-catch to avoid build-time errors
    const path = require('path');
    const fs = require('fs');
    const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
    
    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf-8'));
      console.log("[Firebase Admin] Initializing Firebase Admin with local service-account.json...");
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('[Firebase Admin] Successfully initialized with local service-account.json.');
      return;
    }
  } catch (error: any) {
    // File doesn't exist or can't be loaded - that's fine, use ADC
    if (error.code !== 'MODULE_NOT_FOUND' && !error.message?.includes('Cannot find module')) {
      console.warn('[Firebase Admin] Could not load local service account:', error.message);
    }
  }
  
  // Final fallback: Use Application Default Credentials
  if (!admin.apps.length) {
    try {
      let projectId = process.env.FIREBASE_PROJECT_ID;
      
      // Try FIREBASE_CONFIG
      if (!projectId && process.env.FIREBASE_CONFIG) {
        try {
          const config = JSON.parse(process.env.FIREBASE_CONFIG);
          projectId = config.projectId;
        } catch (parseError) {
          console.warn('[Firebase Admin] Failed to parse FIREBASE_CONFIG in fallback:', parseError);
        }
      }
      
      // Try NEXT_PUBLIC_FIREBASE_PROJECT_ID
      if (!projectId) {
        projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
      }
      
      if (!projectId) {
        throw new Error('FIREBASE_PROJECT_ID environment variable is not set. Cannot initialize Firebase Admin (fallback).');
      }
      console.log("[Firebase Admin] Initializing Firebase Admin with Application Default Credentials (fallback)...");
      admin.initializeApp({
        credential: admin.credential.applicationDefault(),
        projectId: projectId
      });
      console.log('[Firebase Admin] Successfully initialized with Application Default Credentials (fallback).');
    } catch (fallbackError: any) {
      // During build, don't throw - this will work at runtime with proper credentials
      if (fallbackError.message?.includes('Could not load the default credentials')) {
        console.warn('[Firebase Admin] Firebase Admin will be initialized at runtime with Application Default Credentials.');
        if (!admin.apps.length && process.env.NEXT_PHASE === 'phase-production-build') {
          console.warn('⚠️ [Firebase Admin] Falling back to mock Firebase Admin app for build.');
          admin.initializeApp({ projectId: 'build-mock' }, 'build-mock');
        }
        return;
      }
      console.error('❌ [Firebase Admin] Firebase Admin Initialization Failed:', fallbackError);
      // Only throw in development - in production builds, let it fail gracefully
      if (process.env.NODE_ENV !== 'production') {
        throw new Error('Failed to initialize Firebase Admin. Please ensure service account is configured.');
      }
    }
  }
}


// Use a getter to ensure the app is initialized before accessing services
function getFirestoreAdmin() {
  try {
    initializeAdmin();
    if (!firestoreAdmin) {
      const app = admin.apps[0];
      if (!app) {
        // Try one more time to initialize
        console.error('[Firebase Admin] No app found after initialization. Attempting emergency initialization...');
        initializeAdmin();
        const retryApp = admin.apps[0];
        if (!retryApp) {
          const errorMsg = 'Firebase Admin app not initialized. Check FIREBASE_PROJECT_ID and service account configuration.';
          console.error(`[Firebase Admin] ${errorMsg}`);
          throw new Error(errorMsg);
        }
        firestoreAdmin = retryApp.firestore();
      } else {
        firestoreAdmin = app.firestore();
      }
    }
    return firestoreAdmin;
  } catch (error: any) {
    console.error('[Firebase Admin] Error getting Firestore:', error);
    throw error;
  }
}

function getAuthAdmin() {
    try {
        initializeAdmin();
        if (!authAdmin) {
            const app = admin.apps[0];
            if (!app) {
                // Try one more time to initialize
                console.error('[Firebase Admin] No app found after initialization. Attempting emergency initialization...');
                initializeAdmin();
                const retryApp = admin.apps[0];
                if (!retryApp) {
                    const errorMsg = 'Firebase Admin app not initialized. Check FIREBASE_PROJECT_ID and service account configuration.';
                    console.error(`[Firebase Admin] ${errorMsg}`);
                    throw new Error(errorMsg);
                }
                authAdmin = retryApp.auth();
            } else {
                authAdmin = app.auth();
            }
        }
        return authAdmin;
    } catch (error: any) {
        console.error('[Firebase Admin] Error getting Auth:', error);
        throw error;
    }
}

// Export the getter functions
export { getFirestoreAdmin, getAuthAdmin };
