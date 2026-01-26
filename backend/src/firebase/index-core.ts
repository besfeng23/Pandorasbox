import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

export function initializeFirebase(): {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
} {
  if (typeof window === 'undefined') {
    // Return null instances for server-side
    return { firebaseApp: null, firestore: null, auth: null };
  }

  try {
    // Get or initialize Firebase app
    let firebaseApp: FirebaseApp;
    if (getApps().length === 0) {
      if (
        !firebaseConfig.apiKey ||
        !firebaseConfig.authDomain ||
        !firebaseConfig.projectId
      ) {
        console.error('[Firebase] Configuration is missing. Required: apiKey, authDomain, projectId');
        return { firebaseApp: null, firestore: null, auth: null };
      }
      firebaseApp = initializeApp(firebaseConfig);
      console.log('[Firebase] Initialized new Firebase app');
    } else {
      firebaseApp = getApp();
      console.log('[Firebase] Using existing Firebase app');
    }

    if (!firebaseApp) {
      console.error('[Firebase] Error: firebaseApp is null or undefined.');
      return { firebaseApp: null, firestore: null, auth: null };
    }

    // Initialize auth and firestore - these should always succeed if app is initialized
    let auth: Auth;
    let firestore: Firestore;
    
    try {
      auth = getAuth(firebaseApp);
      console.log('[Firebase] Auth initialized');
    } catch (error) {
      console.error('[Firebase] Failed to initialize Auth:', error);
      return { firebaseApp: null, firestore: null, auth: null };
    }

    try {
      firestore = getFirestore(firebaseApp);
      console.log('[Firebase] Firestore initialized');
    } catch (error) {
      console.error('[Firebase] Failed to initialize Firestore:', error);
      return { firebaseApp: null, firestore: null, auth: null };
    }

    // Verify instances are not null (they shouldn't be, but double-check)
    if (!firestore || !auth) {
      console.error('[Firebase] Initialization incomplete. Firestore:', !!firestore, 'Auth:', !!auth);
      return { firebaseApp: null, firestore: null, auth: null };
    }

    return { firebaseApp, firestore, auth };
  } catch (error) {
    console.error('[Firebase] Unexpected error during initialization:', error);
    return { firebaseApp: null, firestore: null, auth: null };
  }
}

export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  const { auth } = initializeFirebase();
  if (auth?.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  return null;
}
