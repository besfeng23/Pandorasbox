'use client';

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { getAuthenticatedUser } from '@/actions/auth';
import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Authentication Context Type
 * - user: DecodedIdToken from server-side session cookie, or null if not authenticated
 * - isLoading: boolean flag for loading state (true while fetching initial session)
 */
interface AuthContextType {
  user: DecodedIdToken | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * AuthProvider component that manages server-side authentication state
 * Uses getAuthenticatedUser() server action to fetch session status from session cookie
 * This provider wraps the app to make authentication state available globally
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<DecodedIdToken | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch authentication status on initial load
  useEffect(() => {
    async function fetchAuthStatus() {
      try {
        const authenticatedUser = await getAuthenticatedUser();
        setUser(authenticatedUser);
      } catch (error) {
        console.error('[AuthProvider] Failed to fetch auth status:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAuthStatus();
  }, []);

  const value: AuthContextType = {
    user,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access the AuthContext
 * Provides easy access to server-side authentication state
 * @throws Error if used outside AuthProvider
 * @returns AuthContextType with user and isLoading
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

