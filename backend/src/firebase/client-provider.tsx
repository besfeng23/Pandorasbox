'use client';

import { useEffect, useState } from 'react';
import { initializeFirebase } from '.';
import { FirebaseProvider } from './provider';
import type { FirebaseApp } from 'firebase/app';
import type { Firestore } from 'firebase/firestore';
import type { Auth } from 'firebase/auth';
import { Loader2 } from 'lucide-react';

interface FirebaseInstances {
  firebaseApp: FirebaseApp;
  firestore: Firestore;
  auth: Auth;
}

// This provider is intended to be used in the root layout of the app.
// It ensures that Firebase is initialized only once on the client.
export function FirebaseClientProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [instances, setInstances] = useState<FirebaseInstances | null>(null);

  useEffect(() => {
    // This effect runs only on the client, after the component mounts.
    try {
      const { firebaseApp, firestore, auth } = initializeFirebase();
      if (firebaseApp && firestore && auth) {
        console.log('[FirebaseClientProvider] Successfully initialized all Firebase instances');
        setInstances({ firebaseApp, firestore, auth });
      } else {
        console.error('[FirebaseClientProvider] Failed to initialize Firebase instances:', {
          firebaseApp: !!firebaseApp,
          firestore: !!firestore,
          auth: !!auth,
        });
        // Only set instances if we have at least the app - this allows components to check availability
        // Components should handle null firestore/auth gracefully
        if (firebaseApp) {
          setInstances({
            firebaseApp,
            firestore: firestore || null,
            auth: auth || null,
          });
        } else {
          console.error('[FirebaseClientProvider] Cannot proceed without firebaseApp');
        }
      }
    } catch (error) {
      console.error('[FirebaseClientProvider] Error during initialization:', error);
    }
  }, []);

  if (!instances) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Only render children if we have all required instances
  if (!instances.firebaseApp || !instances.firestore || !instances.auth) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="text-center space-y-2">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Initializing Firebase...</p>
          {!instances.firestore && (
            <p className="text-xs text-destructive">Firestore initialization failed</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <FirebaseProvider
      firebaseApp={instances.firebaseApp}
      firestore={instances.firestore}
      auth={instances.auth}
    >
      {children}
    </FirebaseProvider>
  );
}
