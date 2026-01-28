'use client';

import { useContext } from 'react';
import { AuthContext } from '@/context/AuthContext';

/**
 * Custom hook to access the authentication context
 * Provides easy access to authentication state throughout the application
 * 
 * @returns AuthContextType with user and loading state
 * @throws Error if used outside AuthProvider
 * 
 * @example
 * ```ts
 * import { useAuth } from '@/hooks/use-auth';
 * 
 * function MyComponent() {
 *   const { user, loading } = useAuth();
 *   
 *   if (loading) {
 *     return <div>Loading...</div>;
 *   }
 *   
 *   if (!user) {
 *     return <div>Please sign in</div>;
 *   }
 *   
 *   return <div>Welcome, {user.email}</div>;
 * }
 * ```
 */
export function useAuth() {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}

