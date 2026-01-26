'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAdminApp } from '@/lib/firebase/firebase-admin';

const SESSION_COOKIE_NAME = 'session';
const SESSION_EXPIRY_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

/**
 * Server Action to create a session from a Firebase ID token
 * Validates the token, creates a session cookie, and redirects to /chat
 * 
 * @param idToken The Firebase ID token from the client
 * @throws Error if token validation fails or session creation fails
 * 
 * @example
 * ```ts
 * import { createSession } from '@/app/auth/actions';
 * 
 * // In a client component after successful Firebase auth
 * const user = await signInWithEmailAndPassword(auth, email, password);
 * const idToken = await user.user.getIdToken();
 * await createSession(idToken);
 * ```
 */
export async function createSession(idToken: string): Promise<void> {
  try {
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Invalid ID token provided');
    }

    const adminApp = getAdminApp();
    const adminAuth = adminApp.auth();

    // Verify the ID token first
    await adminAuth.verifyIdToken(idToken);

    // Create session cookie with 5 days expiry
    const sessionCookie = await adminAuth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY_MS,
    });

    // Set the cookie with appropriate security settings
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 5, // 5 days in seconds
      path: '/',
    });

    console.log('[Auth Actions] Session created successfully');
    
    // Redirect to /chat (or / if /chat doesn't exist)
    redirect('/chat');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Auth Actions] Failed to create session:', errorMessage);
    throw new Error(`Failed to create session: ${errorMessage}`);
  }
}

/**
 * Server Action to handle user logout
 * Clears the session cookie and redirects to /login
 * 
 * @example
 * ```ts
 * import { logout } from '@/app/auth/actions';
 * 
 * // In a client component
 * <button onClick={() => logout()}>Logout</button>
 * ```
 */
export async function logout(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    
    console.log('[Auth Actions] Session cleared');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Auth Actions] Failed to clear session:', errorMessage);
    // Continue with redirect even if clearing cookie fails
  } finally {
    // Always redirect to login
    redirect('/login');
  }
}
