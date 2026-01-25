import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// This function can be called safely on both the server and client.
// On the server, it will return null instances.
// On the client, it will return initialized instances.
export function initializeFirebase(): {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
} {
  if (typeof window !== 'undefined') {
    // Client-side execution
    if (getApps().length === 0) {
      if (
        !firebaseConfig.apiKey ||
        !firebaseConfig.authDomain ||
        !firebaseConfig.projectId
      ) {
        // Log error but don't throw during initialization to avoid crashing SSR
        console.error('Firebase configuration is missing in client.');
        return { firebaseApp: null, firestore: null, auth: null };
      }
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
    
    return { firebaseApp, firestore, auth };
  }

  // Return null instances for server-side
  return { firebaseApp: null, firestore: null, auth: null };
}

export async function getAuthToken(): Promise<string | null> {
  if (typeof window === 'undefined') return null;
  
  const { auth } = initializeFirebase();
  if (auth?.currentUser) {
    return await auth.currentUser.getIdToken();
  }
  return null;
}

export { FirebaseProvider, useFirebase, useFirebaseApp, useFirestore, useAuth } from './provider';
export { FirebaseClientProvider } from './client-provider';
export { useUser } from './auth/use-user';
