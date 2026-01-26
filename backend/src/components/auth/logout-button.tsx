'use client';

import { useState } from 'react';
import { signOut } from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase/client';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut } from 'lucide-react';

/**
 * LogoutButton component
 * Provides a button to log out the current user using Firebase Auth
 * 
 * @example
 * ```tsx
 * import { LogoutButton } from '@/components/auth/logout-button';
 * 
 * <LogoutButton />
 * ```
 */
export function LogoutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const auth = getFirebaseAuth();
      await signOut(auth);
      // The auth state change will be handled by the AuthProvider
      // No need to redirect here as the app will react to the auth state change
    } catch (error: any) {
      console.error('Logout error:', error);
      setError(error.message || 'Failed to sign out. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-md bg-destructive/10 p-2 text-sm text-destructive">
          {error}
        </div>
      )}
      <Button
        onClick={handleLogout}
        disabled={isLoading}
        variant="outline"
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing out...
          </>
        ) : (
          <>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </>
        )}
      </Button>
    </div>
  );
}

