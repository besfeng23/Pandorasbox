import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebase-admin';
import { corsHeaders } from '@/lib/cors';
import type { DecodedIdToken } from 'firebase-admin/auth';
import type { AuthUser } from '@/contracts/auth';

export class AuthError extends Error {
  readonly status: 401 | 403 | 500;

  constructor(message: string, status: 401 | 403 | 500) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
  }
}

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
    throw new AuthError('Unauthorized', 401);
  }

  const decoded = await getAuthAdmin().verifyIdToken(token);
  return userFromClaims(decoded);
}

export async function requireAdmin(request: NextRequest): Promise<AuthUser> {
  const user = await requireUser(request);
  if (!user.isAdmin) {
    throw new AuthError('Forbidden', 403);
  }
  return user;
}

export function requireCron(request: NextRequest): void {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    throw new AuthError('Cron secret not configured', 500);
  }

  const authHeader = request.headers.get('authorization');
  const provided = authHeader?.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
  if (!provided || provided !== expected) {
    throw new AuthError('Unauthorized', 401);
  }
}

export function unauthorizedResponse() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function forbiddenResponse() {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

export function handleApiError(error: unknown, request?: NextRequest, label = 'API route error') {
  if (error instanceof AuthError) {
    if (error.status === 403) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: corsHeaders(request) });
    }
    if (error.status === 401) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: corsHeaders(request) });
    }
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500, headers: corsHeaders(request) });
  }

  console.error(label, error);
  return NextResponse.json({ error: 'Internal server error' }, { status: 500, headers: corsHeaders(request) });
}
