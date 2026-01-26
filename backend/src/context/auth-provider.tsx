'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';

/**
 * Authentication Context Type
 * - user: null = unauthenticated, User = authenticated
 * - loading: boolean flag indicating if the initial authentication status is being determined
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component that manages Firebase authentication state globally
 * Uses onAuthStateChanged listener to track user authentication status
 * Manages loading state while the initial authentication status is being determined
 * 
 * @param children - React children to be wrapped by the provider
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let authInstance;
    
    try {
      // Get Firebase Auth instance
      authInstance = getFirebaseAuth();
    } catch (error) {
      console.error('[AuthProvider] Failed to initialize Firebase Auth:', error);
      setUser(null);
      setLoading(false);
      return;
    }

    // Set up the auth state change listener
    const unsubscribe = onAuthStateChanged(
      authInstance,
      (firebaseUser) => {
        // firebaseUser is null if unauthenticated, User object if authenticated
        setUser(firebaseUser);
        // Set loading to false once we have the initial auth state
        setLoading(false);
      },
      (error) => {
        console.error('[AuthProvider] Auth state change error:', error);
        setUser(null);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  const value: AuthContextType = {
    user,
    loading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

