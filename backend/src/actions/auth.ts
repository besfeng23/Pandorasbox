'use server';

import { cookies } from 'next/headers';
import { adminAuth } from '@/lib/firebase/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

/**
 * Server Action to sign in a user and create a session cookie
 * Takes a Firebase ID token from the client and creates a secure session cookie
 * 
 * @param idToken The Firebase ID token generated on the client (from signInWithEmailAndPassword)
 * @throws Error if token is invalid or session cookie creation fails
 * 
 * @example
 * ```ts
 * import { signInAction } from '@/actions/auth';
 * 
 * // After successful client-side sign in
 * const idToken = await user.getIdToken();
 * await signInAction(idToken);
 * ```
 */
export async function signInAction(idToken: string): Promise<void> {
  try {
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Invalid ID token provided');
    }

    // Create session cookie with 5-day expiration (in milliseconds)
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: 60 * 60 * 24 * 5 * 1000, // 5 days
    });

    // Set the session cookie with secure settings
    const cookieStore = await cookies();
    cookieStore.set('session', sessionCookie, {
      httpOnly: true, // Prevent JavaScript access for security
      secure: process.env.NODE_ENV === 'production', // HTTPS only in production
      path: '/', // Available across entire site
      maxAge: 60 * 60 * 24 * 5, // 5 days in seconds
      sameSite: 'lax', // CSRF protection
    });

    console.log('[Auth Actions] Session cookie created successfully');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Auth Actions] Failed to create session cookie:', errorMessage);
    throw new Error(`Failed to sign in: ${errorMessage}`);
  }
}

/**
 * Server Action to sign out a user
 * Deletes the session cookie to end the user's session
 * 
 * @example
 * ```ts
 * import { signOutAction } from '@/actions/auth';
 * 
 * await signOutAction();
 * ```
 */
export async function signOutAction(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');
    console.log('[Auth Actions] Session cookie deleted');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Auth Actions] Failed to delete session cookie:', errorMessage);
    // Don't throw - best effort to clear cookie
  }
}

/**
 * Server Action to get the currently authenticated user
 * Retrieves and verifies the session cookie, returning the decoded user payload
 * 
 * @returns The decoded ID token (DecodedIdToken) if session is valid, null otherwise
 * 
 * @example
 * ```ts
 * import { getAuthenticatedUser } from '@/actions/auth';
 * 
 * const user = await getAuthenticatedUser();
 * if (user) {
 *   console.log('User ID:', user.uid);
 *   console.log('User email:', user.email);
 * }
 * ```
 */
export async function getAuthenticatedUser(): Promise<DecodedIdToken | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session')?.value;

    // If no cookie exists, user is not authenticated
    if (!sessionCookie) {
      return null;
    }

    // Verify and decrypt the session cookie
    // The second parameter (true) enables revocation check
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie, true);

    return decodedToken;
  } catch (error: any) {
    // If verification fails, return null (user is not authenticated)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('[Auth Actions] Session cookie verification failed:', errorMessage);
    return null;
  }
}

