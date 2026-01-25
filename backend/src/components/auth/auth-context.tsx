'use client';

import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { onAuthStateChanged, signOut, type User } from 'firebase/auth';
import { getAuth } from '@/lib/firebase/firebase-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component that manages Firebase authentication state
 * Uses onAuthStateChanged listener to track user authentication status
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;

    try {
      // Get Firebase Auth instance
      const auth = getAuth();

      // Set up auth state listener
      unsubscribe = onAuthStateChanged(
        auth,
        (firebaseUser) => {
          setUser(firebaseUser);
          // Only set loading to false after initial auth state is determined
          setLoading(false);
        },
        (error) => {
          console.error('Auth state change error:', error);
          setUser(null);
          setLoading(false);
        }
      );
    } catch (error) {
      console.error('Failed to initialize Firebase Auth:', error);
      setUser(null);
      setLoading(false);
    }

    // Cleanup subscription on unmount
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  /**
   * Sign out the current user
   */
  const logout = async (): Promise<void> => {
    try {
      const auth = getAuth();
      await signOut(auth);
      // onAuthStateChanged will update the user state automatically
    } catch (error: any) {
      console.error('Logout error:', error);
      throw new Error(error.message || 'Failed to sign out. Please try again.');
    }
  };

  const value: AuthContextType = {
    user,
    loading,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the AuthContext
 * @throws Error if used outside AuthProvider
 */
export function useAuthContext(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}

