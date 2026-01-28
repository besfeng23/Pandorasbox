'use server';

import 'server-only';
import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getAdminApp } from '@/lib/firebase/firebase-admin';

const SESSION_COOKIE_NAME = 'session';
const SESSION_EXPIRY_MS = 60 * 60 * 24 * 5 * 1000; // 5 days

/**
 * Sign in with email and password
 * Note: This Server Action accepts an ID token that should be obtained
 * from client-side Firebase authentication first
 * @param idToken The Firebase ID token from client-side authentication
 */
export async function signIn(idToken: string): Promise<void> {
  try {
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Invalid ID token provided');
    }

    const auth = getAdminApp().auth();

    // Verify the ID token first
    const decodedToken = await auth.verifyIdToken(idToken);

    // Create session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY_MS,
    });

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_EXPIRY_MS / 1000, // Convert to seconds
      path: '/',
    });

    console.log(`[Auth Actions] User ${decodedToken.uid} signed in successfully`);
    redirect('/');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Auth Actions] Sign in failed:', errorMessage);
    throw new Error(`Sign in failed: ${errorMessage}`);
  }
}

/**
 * Sign up with email and password
 * Note: This Server Action accepts an ID token that should be obtained
 * from client-side Firebase authentication first
 * @param idToken The Firebase ID token from client-side user creation
 */
export async function signUp(idToken: string): Promise<void> {
  try {
    if (!idToken || typeof idToken !== 'string') {
      throw new Error('Invalid ID token provided');
    }

    const auth = getAdminApp().auth();

    // Verify the ID token first
    const decodedToken = await auth.verifyIdToken(idToken);

    // Create session cookie
    const sessionCookie = await auth.createSessionCookie(idToken, {
      expiresIn: SESSION_EXPIRY_MS,
    });

    // Set the session cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_EXPIRY_MS / 1000, // Convert to seconds
      path: '/',
    });

    console.log(`[Auth Actions] User ${decodedToken.uid} signed up successfully`);
    redirect('/');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Auth Actions] Sign up failed:', errorMessage);
    throw new Error(`Sign up failed: ${errorMessage}`);
  }
}

/**
 * Sign out the current user
 * Clears the session cookie and redirects to login
 */
export async function signOut(): Promise<void> {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
    console.log('[Auth Actions] User signed out successfully');
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Auth Actions] Sign out failed:', errorMessage);
    // Continue with redirect even if clearing cookie fails
  } finally {
    redirect('/login');
  }
}

