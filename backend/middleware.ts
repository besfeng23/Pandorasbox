import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_ROUTES = new Set(['/login', '/signup']);
const PROTECTED_PAGE_PREFIXES = ['/chat', '/settings', '/memory', '/connectors', '/agents'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.has(pathname);
}

function isProtectedPage(pathname: string): boolean {
  return pathname === '/' || PROTECTED_PAGE_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function hasSessionCookie(request: NextRequest): boolean {
  return Boolean(request.cookies.get('__session')?.value || request.cookies.get('session')?.value);
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Middleware only applies to pages by matcher below.
  const isAuthenticated = hasSessionCookie(request);

  if (isPublicRoute(pathname) && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  if (isProtectedPage(pathname) && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    if (pathname !== '/') {
      url.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
