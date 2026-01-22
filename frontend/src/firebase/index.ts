
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

export function initializeFirebase() {
    if (!firebaseConfig.apiKey) {
        // Return dummy objects during build/prerendering if API key is missing
        return { 
            app: null as any, 
            auth: null as any, 
            db: null as any 
        };
    }
    const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    return { app, auth, db };
}

// Re-export hooks and providers
export { FirebaseProvider, useFirebaseApp, useAuth, useFirestore, useFirebase } from './provider';
export { useUser } from './auth/use-user';
export { useAuthActions } from './auth/use-auth-actions';
