
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { firebaseConfig } from './config';

export function initializeFirebase() {
    // Detailed logging for debugging
    if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
        console.log('Firebase Init: Checking configuration...', {
            hasApiKey: !!firebaseConfig.apiKey,
            projectId: firebaseConfig.projectId,
            apiKeyPrefix: firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 5) + '...' : 'none'
        });
    }

    if (!firebaseConfig.apiKey) {
        // Log a descriptive error for the developer
        console.error('Firebase Error: NEXT_PUBLIC_FIREBASE_API_KEY is missing. Check your environment variables.');
        
        // Return null objects during build/prerendering, but these will be checked by hooks
        return { 
            app: null as any, 
            auth: null as any, 
            db: null as any 
        };
    }
    try {
        const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
        
        if (!app) {
            console.error('Firebase Error: initializeApp returned null or undefined.');
            return { app: null as any, auth: null as any, db: null as any };
        }

        const auth = getAuth(app);
        const db = getFirestore(app);
        
        if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
            console.log('Firebase Init: Success!', {
                appId: app.options.appId,
                authReady: !!auth,
                dbReady: !!db
            });
        }

        return { app, auth, db };
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        return { 
            app: null as any, 
            auth: null as any, 
            db: null as any 
        };
    }
}

// Re-export hooks and providers
export { FirebaseProvider, useFirebaseApp, useAuth, useFirestore, useFirebase } from './provider';
export { useUser } from './auth/use-user';
export { useAuthActions } from './auth/use-auth-actions';
