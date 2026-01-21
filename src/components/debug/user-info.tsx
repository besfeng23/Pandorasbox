'use client';

import { useUser } from '@/firebase';
import { useEffect } from 'react';

/**
 * Debug component to log user info
 * Add this temporarily to see what user ID is being used
 */
export function UserInfoDebug() {
  const { user, isLoading } = useUser();

  useEffect(() => {
    if (user) {
      console.log('=== USER INFO DEBUG ===');
      console.log('User ID (uid):', user.uid);
      console.log('User Email:', user.email);
      console.log('User Display Name:', user.displayName);
      console.log('======================');
    } else if (!isLoading) {
      console.log('=== USER INFO DEBUG ===');
      console.log('No user authenticated');
      console.log('======================');
    }
  }, [user, isLoading]);

  // Optionally render in UI
  if (!user) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 text-xs rounded border border-cyan-400/30 z-50">
      <div>UID: {user.uid.substring(0, 20)}...</div>
      <div>Email: {user.email}</div>
    </div>
  );
}

