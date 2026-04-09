import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebase-admin';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { AuthUser } from '@/contracts/auth';

export function parseBearerTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.slice('Bearer '.length).trim() || null;
}

function parseBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('authorization');
  return parseBearerTokenFromHeader(authHeader);
}

export function userFromClaims(decoded: DecodedIdToken): AuthUser {
  return {
    uid: decoded.uid,
    email: decoded.email,
    isAdmin: decoded.admin === true || decoded.role === 'admin' || decoded.roles?.includes?.('admin') === true,
  };
}

export async function requireUser(request: NextRequest): Promise<AuthUser> {
  const token = parseBearerToken(request);
  if (!token) {
    throw new Error('Unauthorized');
  }

  const decoded = await getAuthAdmin().verifyIdToken(token);
  return userFromClaims(decoded);
}

export async function requireAdmin(request: NextRequest): Promise<AuthUser> {
  const user = await requireUser(request);
  if (!user.isAdmin) {
    throw new Error('Forbidden');
  }
  return user;
}

export function requireCron(request: NextRequest): void {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    throw new Error('Cron secret not configured');
  }

  const authHeader = request.headers.get('authorization');
  const provided = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!provided || provided !== expected) {
    throw new Error('Unauthorized');
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}
