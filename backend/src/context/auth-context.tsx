'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { firebaseAuth } from '@/lib/firebase/firebase-client';

/**
 * Authentication Context Type
 * - user: The current Firebase User object, or null if unauthenticated
 * - loading: Boolean indicating if the initial auth state is being loaded
 */
interface AuthContextType {
  user: User | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component that manages Firebase authentication state globally
 * Uses onAuthStateChanged listener to track user authentication status
 * Provides user and loading state to all child components
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Set up auth state listener
  useEffect(() => {
    // Set up the auth state change listener
    const unsubscribe = onAuthStateChanged(
      firebaseAuth,
      (firebaseUser) => {
        // firebaseUser is null if unauthenticated, User object if authenticated
        setUser(firebaseUser);
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

/**
 * Hook to access the AuthContext
 * Provides easy access to authentication state
 * @throws Error if used outside AuthProvider
 * @returns AuthContextType with user and loading state
 * 
 * @example
 * ```tsx
 * import { useAuth } from '@/context/auth-context';
 * 
 * function MyComponent() {
 *   const { user, loading } = useAuth();
 *   
 *   if (loading) return <div>Loading...</div>;
 *   if (!user) return <div>Please sign in</div>;
 *   
 *   return <div>Welcome, {user.email}</div>;
 * }
 * ```
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

