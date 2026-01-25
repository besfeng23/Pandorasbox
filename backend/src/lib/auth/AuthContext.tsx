'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  type User,
  type Auth,
} from 'firebase/auth';
import { useAuth } from '@/firebase';
import { useRouter } from 'next/navigation';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * AuthProvider component that manages Firebase authentication state
 * and provides authentication utilities to child components.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const auth = useAuth();
  const router = useRouter();

  // Listen for auth state changes
  useEffect(() => {
    if (!auth) {
      setIsLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUser(firebaseUser);
        setIsLoading(false);
      },
      (error) => {
        console.error('Auth state change error:', error);
        setUser(null);
        setIsLoading(false);
      }
    );

    return () => unsubscribe();
  }, [auth]);

  /**
   * Login with email and password
   */
  const login = useCallback(
    async (email: string, password: string) => {
      if (!auth) {
        throw new Error('Auth not initialized');
      }

      try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will update the user state
      } catch (error: any) {
        // Map Firebase Auth errors to user-friendly messages
        const errorCode = error.code;
        let errorMessage = 'An error occurred during login.';

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
   */
  const signup = useCallback(
    async (email: string, password: string) => {
      if (!auth) {
        throw new Error('Auth not initialized');
      }

      try {
        await createUserWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will update the user state
        // Redirect will be handled by the signup page
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
   * Logout the current user
   */
  const logout = useCallback(async () => {
    if (!auth) {
      throw new Error('Auth not initialized');
    }

    try {
      await signOut(auth);
      // onAuthStateChanged will update the user state
      router.push('/login');
    } catch (error: any) {
      throw new Error(error.message || 'Failed to sign out. Please try again.');
    }
  }, [auth, router]);

  const value: AuthContextValue = {
    user,
    isLoading,
    login,
    signup,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the AuthContext
 * @throws Error if used outside AuthProvider
 */
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

