import { NextRequest, NextResponse } from 'next/server';
import { getAuthAdmin } from '@/lib/firebase-admin';

export type AuthUser = { uid: string; email?: string; isAdmin: boolean };

export function parseBearerTokenFromHeader(header: string | null): string | null {
  if (!header) return null;
  const m = header.match(/^Bearer\s+(.+)$/i);
  return m?.[1] ?? null;
}

function hasAdminClaim(decoded: Record<string, any>): boolean {
  return decoded.admin === true || decoded.role === 'admin' || (Array.isArray(decoded.roles) && decoded.roles.includes('admin')) || decoded.platformRole === 'superadmin' || decoded.platformRole === 'support';
}

export async function requireUser(request: NextRequest): Promise<AuthUser> {
  const token = parseBearerTokenFromHeader(request.headers.get('authorization') || request.headers.get('Authorization'));
  if (!token) throw new Error('UNAUTHORIZED');
  const decoded = await getAuthAdmin().verifyIdToken(token);
  return { uid: decoded.uid, email: decoded.email, isAdmin: hasAdminClaim(decoded as any) };
}

export async function requireAdmin(request: NextRequest): Promise<AuthUser> {
  const user = await requireUser(request);
  if (!user.isAdmin) throw new Error('FORBIDDEN');
  return user;
}

export function requireCron(request: NextRequest): true {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new Error('CRON_NOT_CONFIGURED');
  const auth = parseBearerTokenFromHeader(request.headers.get('authorization') || request.headers.get('Authorization'));
  const x = request.headers.get('x-cron-secret');
  if (auth !== secret && x !== secret) throw new Error('UNAUTHORIZED');
  return true;
}

export function handleApiError(error: unknown) {
  const message = error instanceof Error ? error.message : 'Internal Server Error';
  if (message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (message === 'FORBIDDEN') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  if (message === 'CRON_NOT_CONFIGURED') return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
  return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
}
