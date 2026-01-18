'use server';

import 'server-only';
import { getAuthAdmin } from '@/lib/firebase-admin';

export interface AuthResult {
    uid: string;
    email?: string;
}

export async function verifyFirebaseToken(authHeader: string | null): Promise<AuthResult | null> {
    if (!authHeader) return null;

  const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token) return null;

  try {
        const authAdmin = getAuthAdmin();
        const decodedToken = await authAdmin.verifyIdToken(token);
        return {
                uid: decodedToken.uid,
                email: decodedToken.email,
        };
  } catch (error) {
        console.error('Token verification failed:', error);
        return null;
  }
}

export async function verifySessionCookie(cookie: string | null): Promise<AuthResult | null> {
    if (!cookie) return null;

  try {
        const authAdmin = getAuthAdmin();
        const decodedClaims = await authAdmin.verifySessionCookie(cookie, true);
        return {
                uid: decodedClaims.uid,
                email: decodedClaims.email,
        };
  } catch (error) {
        console.error('Session cookie verification failed:', error);
        return null;
  }
}
