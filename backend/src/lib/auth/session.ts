'use server';

import 'server-only';
import { cookies } from 'next/headers';
import { getAdminApp } from '@/lib/firebase/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';

const SESSION_COOKIE_NAME = 'session';

/**
 * Verify the session cookie and return the decoded token
 * This is the primary function for checking if a user is authenticated
 * 
 * @returns The decoded ID token if valid, null otherwise
 * 
 * @example
 * ```ts
 * import { verifySession } from '@/lib/auth/session';
 * 
 * // In a Server Component or Server Action
 * const decodedToken = await verifySession();
 * if (!decodedToken) {
 *   // User is not authenticated
 *   redirect('/login');
 * }
 * ```
 */
export async function verifySession(): Promise<DecodedIdToken | null> {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

    if (!sessionCookie || !sessionCookie.value) {
      return null;
    }

    const adminApp = getAdminApp();
    const adminAuth = adminApp.auth();
    
    // Verify the session cookie with revocation check
    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie.value, true);

    return decodedToken;
  } catch (error: any) {
    // Log verification errors but don't throw - return null to indicate invalid session
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.warn('[Session] Session cookie verification failed:', errorMessage);
    return null;
  }
}
