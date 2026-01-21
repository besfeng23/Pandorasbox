import { getApp, getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

let firebaseApp: FirebaseApp;
let auth: Auth;
let firestore: Firestore;

// This function can be called safely on both the server and client.
// On the server, it will return uninitialized instances.
// On the client, it will return initialized instances.
export function initializeFirebase(): {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
} {
  if (typeof window !== 'undefined') {
    // Client-side execution
    if (getApps().length === 0) {
      if (
        !firebaseConfig.apiKey ||
        !firebaseConfig.authDomain ||
        !firebaseConfig.projectId
      ) {
        throw new Error(
          'Firebase configuration is missing. Make sure to set NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN, and NEXT_PUBLIC_FIREBASE_PROJECT_ID in your .env file.'
        );
      }
      firebaseApp = initializeApp(firebaseConfig);
    } else {
      firebaseApp = getApp();
    }
    auth = getAuth(firebaseApp);
    firestore = getFirestore(firebaseApp);
  }

  // Return instances for both server and client.
  // On the server, they will be uninitialized and will be properly
  // initialized on the client.
  return { firebaseApp, firestore, auth };
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
