// Export auth hooks
export { useUser } from './auth/use-user';
export { useAuthActions } from './auth/use-auth-actions';

// Export providers and hooks
export { FirebaseProvider, useFirebase, useFirebaseApp, useFirestore, useAuth } from './provider';
export { FirebaseClientProvider } from './client-provider';

// Re-export initializer
export { initializeFirebase, getAuthToken } from './index-core';
