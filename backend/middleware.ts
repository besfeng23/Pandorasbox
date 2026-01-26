import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { verifySession } from '@/lib/auth/session';

/**
 * Public routes that don't require authentication
 */
const PUBLIC_ROUTES = ['/login', '/signup'];

/**
 * Protected routes that require authentication
 */
const PROTECTED_ROUTES = ['/', '/chat'];

/**
 * Static file patterns that should be allowed
 */
const STATIC_PATTERNS = [
  /^\/_next\//,
  /^\/api\/auth\//,
  /\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot)$/,
];

/**
 * Check if a path is a public route
 */
function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

/**
 * Check if a path is a protected route
 */
function isProtectedRoute(pathname: string): boolean {
  // Root path is protected
  if (pathname === '/') {
    return true;
  }
  // Check if pathname starts with any protected route
  return PROTECTED_ROUTES.some((route) => pathname.startsWith(route));
}

/**
 * Check if a path is a static asset
 */
function isStaticAsset(pathname: string): boolean {
  return STATIC_PATTERNS.some((pattern) => pattern.test(pathname));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow static assets and Next.js internals
  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  // Verify session cookie
  const decodedToken = await verifySession();
  const isAuthenticated = decodedToken !== null;
  const isPublic = isPublicRoute(pathname);
  const isProtected = isProtectedRoute(pathname);

  // If accessing a public route while authenticated, redirect to home
  if (isPublic && isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/';
    return NextResponse.redirect(url);
  }

  // If accessing a protected route while not authenticated, redirect to login
  if (isProtected && !isAuthenticated) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Add the original path as a query parameter for redirect after login
    if (pathname !== '/') {
      url.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(url);
  }

  // Allow the request to proceed
  return NextResponse.next();
}

/**
 * Configure which routes the middleware should run on
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api routes (unless they need auth)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};

