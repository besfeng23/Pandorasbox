'use server';

import { redirect } from 'next/navigation';
import { setSessionCookie, clearSessionCookie } from '@/lib/auth/session';

/**
 * Server Action to handle user login
 * Sets a session cookie from the Firebase ID token and redirects to home
 * @param idToken The Firebase ID token from the client
 */
export async function handleLogin(idToken: string): Promise<void> {
  try {
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Invalid ID token provided');
    }

    await setSessionCookie(idToken);
    redirect('/');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Auth Actions] Login failed:', errorMessage);
    throw new Error(`Login failed: ${errorMessage}`);
  }
}

/**
 * Server Action to handle user logout
 * Clears the session cookie and redirects to login page
 */
export async function handleLogout(): Promise<void> {
  try {
    await clearSessionCookie();
    redirect('/login');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Auth Actions] Logout failed:', errorMessage);
    // Still redirect even if clearing cookie fails
    redirect('/login');
  }
}

