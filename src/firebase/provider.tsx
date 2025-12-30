'use client';

import {
  createContext,
  useContext,
  type ReactNode,
} from 'react';

import type { Auth } from 'firebase/auth';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';

interface FirebaseContextValue {
  firebaseApp: FirebaseApp | null;
  firestore: Firestore | null;
  auth: Auth | null;
}

const FirebaseContext = createContext<FirebaseContextValue>({
  firebaseApp: null,
  firestore: null,
  auth: null,
});

/**
 * Provides the Firebase app, Firestore, and Auth instances to its children.
 */
export function FirebaseProvider({
  children,
  firebaseApp,
  firestore,
  auth,
}: {
  children: ReactNode;
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}) {
  return (
    <FirebaseContext.Provider
      value={{
        firebaseApp,
        firestore,
        auth,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

/**
 * Returns the Firebase context value.
 * @throws Will throw an error if the hook is not used within a FirebaseProvider.
 */
export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}

/**
 * Returns the Firebase app instance.
 * @throws Will throw an error if the hook is not used within a FirebaseProvider.
 */
export function useFirebaseApp() {
  const { firebaseApp } = useFirebase();
  if (!firebaseApp) {
    throw new Error('Firebase app not available');
  }
  return firebaseApp;
}

/**
 * Returns the Firestore instance.
 * @throws Will throw an error if the hook is not used within a FirebaseProvider.
 */
export function useFirestore() {
  const { firestore } = useFirebase();
  if (!firestore) {
    throw new Error('Firestore not available');
  }
  return firestore;
}

/**
 * Returns the Auth instance.
 * @throws Will throw an error if the hook is not used within a FirebaseProvider.
 */
export function useAuth() {
  const { auth } = useFirebase();
  if (!auth) {
    throw new Error('Auth not available');
  }
  return auth;
}
