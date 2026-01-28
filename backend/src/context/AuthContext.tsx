'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
  type Auth,
} from 'firebase/auth';
import { auth as authInstance } from '@/lib/firebase/firebase-client';

/**
 * Authentication Context Type
 * - user: undefined = loading/unresolved, null = unauthenticated, User = authenticated
 * - isLoading: boolean flag for loading state (derived from user === undefined)
 * - signIn: email/password sign in function
 * - signUp: email/password sign up function
 * - signOut: sign out function
 */
interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component that manages Firebase authentication state globally
 * Uses onAuthStateChanged listener to track user authentication status
 * Provides signIn, signUp, and signOut functions for email/password authentication
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [auth, setAuth] = useState<Auth | null>(null);

  // Initialize Firebase Auth on mount
  useEffect(() => {
    try {
      setAuth(authInstance);
    } catch (error) {
      console.error('[AuthProvider] Failed to initialize Firebase Auth:', error);
      setUser(null); // Set to null (unauthenticated) if initialization fails
    }
  }, []);

  // Set up auth state listener
  useEffect(() => {
    if (!auth) {
      return; // Wait for auth to be initialized
    }

    // Set up the auth state change listener
    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        // firebaseUser is null if unauthenticated, User object if authenticated
        setUser(firebaseUser);
      },
      (error) => {
        console.error('[AuthProvider] Auth state change error:', error);
        setUser(null); // Set to null (unauthenticated) on error
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [auth]);

  /**
   * Sign in with email and password
   * @param email User's email address
   * @param password User's password
   * @throws Error if authentication fails
   */
  const signIn = useCallback(
    async (email: string, password: string): Promise<void> => {
      if (!auth) {
        throw new Error('Auth not initialized');
      }

      try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will update the user state automatically
      } catch (error: any) {
        // Map Firebase Auth errors to user-friendly messages
        const errorCode = error.code;
        let errorMessage = 'An error occurred during sign in.';

        switch (errorCode) {
          case 'auth/user-not-found':
            errorMessage = 'No account found with this email address.';
            break;
          case 'auth/wrong-password':
            errorMessage = 'Incorrect password. Please try again.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address.';
            break;
          case 'auth/user-disabled':
            errorMessage = 'This account has been disabled.';
            break;
          case 'auth/too-many-requests':
            errorMessage = 'Too many failed login attempts. Please try again later.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection.';
            break;
          default:
            errorMessage = error.message || 'Failed to sign in. Please try again.';
        }

        throw new Error(errorMessage);
      }
    },
    [auth]
  );

  /**
   * Sign up with email and password
   * @param email User's email address
   * @param password User's password
   * @throws Error if registration fails
   */
  const signUp = useCallback(
    async (email: string, password: string): Promise<void> => {
      if (!auth) {
        throw new Error('Auth not initialized');
      }

      try {
        await createUserWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will update the user state automatically
      } catch (error: any) {
        // Map Firebase Auth errors to user-friendly messages
        const errorCode = error.code;
        let errorMessage = 'An error occurred during registration.';

        switch (errorCode) {
          case 'auth/email-already-in-use':
            errorMessage = 'An account with this email already exists.';
            break;
          case 'auth/invalid-email':
            errorMessage = 'Invalid email address.';
            break;
          case 'auth/operation-not-allowed':
            errorMessage = 'Email/password accounts are not enabled.';
            break;
          case 'auth/weak-password':
            errorMessage = 'Password is too weak. Please use a stronger password.';
            break;
          case 'auth/network-request-failed':
            errorMessage = 'Network error. Please check your connection.';
            break;
          default:
            errorMessage = error.message || 'Failed to create account. Please try again.';
        }

        throw new Error(errorMessage);
      }
    },
    [auth]
  );

  /**
   * Sign out the current user
   * @throws Error if sign out fails
   */
  const handleSignOut = useCallback(async (): Promise<void> => {
    if (!auth) {
      throw new Error('Auth not initialized');
    }

    try {
      await signOut(auth);
      // onAuthStateChanged will update the user state automatically
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out. Please try again.');
    }
  }, [auth]);

  // Derive isLoading from user state: undefined = loading, null/User = not loading
  const isLoading = user === undefined;

  const value: AuthContextType = {
    user,
    isLoading,
    signIn,
    signUp,
    signOut: handleSignOut,
  };

  // Show loading state until initial user state is resolved
  if (isLoading) {
    return (
      <AuthContext.Provider value={value}>
        <div>Loading...</div>
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the AuthContext
 * Provides easy access to authentication state and functions
 * @throws Error if used outside AuthProvider
 * @returns AuthContextType with user, isLoading, signIn, signUp, and signOut
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

