
'use client';

import { createContext, useContext, ReactNode } from 'react';
import { type FirebaseApp } from 'firebase/app';
import { type Auth } from 'firebase/auth';
import { type Firestore } from 'firebase/firestore';
import { initializeFirebase } from './index';
import { FirebaseErrorListener } from '@/components/FirebaseErrorListener';

interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: ReactNode }) {
  const { app, auth, db } = initializeFirebase();

  // Development logging to help identify configuration issues
  if (process.env.NODE_ENV === 'development') {
    if (!app) console.warn('FirebaseProvider: Firebase app is not initialized. Check your environment variables.');
  }

  return (
    <FirebaseContext.Provider value={{ app, auth, db }}>
      <FirebaseErrorListener />
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (context === undefined || context === null) {
    throw new Error('useFirebase must be used within a FirebaseProvider. Context is currently ' + (context === null ? 'null' : 'undefined'));
  }
  return context;
}

export function useFirebaseApp() {
  const context = useContext(FirebaseContext);
  if (context === undefined || context === null) {
    throw new Error('useFirebaseApp must be used within a FirebaseProvider');
  }
  if (!context.app) {
    throw new Error('Firebase App is not initialized. Please check your NEXT_PUBLIC_FIREBASE_* environment variables. Context exists but app is null.');
  }
  return context.app;
}

export function useAuth() {
  const context = useContext(FirebaseContext);
  if (context === undefined || context === null) {
    throw new Error('useAuth must be used within a FirebaseProvider');
  }
  if (!context.auth) {
    throw new Error('Firebase Auth is not initialized. Please check your NEXT_PUBLIC_FIREBASE_* environment variables. Context exists but auth is null.');
  }
  return context.auth;
}

export function useFirestore() {
  const context = useContext(FirebaseContext);
  if (context === undefined || context === null) {
    throw new Error('useFirestore must be used within a FirebaseProvider');
  }
  if (!context.db) {
    throw new Error('Firebase Firestore is not initialized. Please check your NEXT_PUBLIC_FIREBASE_* environment variables. Context exists but db is null.');
  }
  return context.db;
}
