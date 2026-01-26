'use server';

import 'server-only';
import { cookies } from 'next/headers';
import { getAuthAdmin } from '@/lib/firebase/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

const SESSION_COOKIE_NAME = 'session';
const SESSION_EXPIRY_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

/**
 * Set a session cookie using Firebase Admin SDK
 * Creates a session cookie from the ID token with 5 days expiry
 * @param idToken The Firebase ID token from the client
 */
export async function setSessionCookie(idToken: string): Promise<void> {
  try {
    const auth = getAuthAdmin();
    
    // Create session cookie with 5 days expiry
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY_MS,
    });

    // Set the cookie with appropriate security settings
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_EXPIRY_MS / 1000, // Convert to seconds
      path: '/',
    });

    console.log('[Session] Session cookie set successfully');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Session] Failed to set session cookie:', errorMessage);
    throw new Error(`Failed to set session cookie: ${errorMessage}`);
  }
}

/**
 * Clear the session cookie
 * Removes the session cookie from the client
 */
export async function clearSessionCookie(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    console.log('[Session] Session cookie cleared');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Session] Failed to clear session cookie:', errorMessage);
    // Don't throw - clearing cookie is best effort
  }
}

/**
 * Verify the session cookie and return the decoded token
 * @returns The decoded ID token if valid, null otherwise
 */
export async function verifySessionCookie(): Promise<DecodedIdToken | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const auth = getAuthAdmin();
    
    // Verify the session cookie with revocation check
    const decodedToken = await auth.verifySessionCookie(sessionCookie.value, true);

    return decodedToken;
  } catch (error: any) {
    // Log verification errors but don't throw - return null to indicate invalid session
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('[Session] Session cookie verification failed:', errorMessage);
    return null;
  }
}

