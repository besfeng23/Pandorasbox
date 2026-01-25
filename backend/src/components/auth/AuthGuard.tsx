'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthContext } from '@/lib/auth/AuthContext';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
}

/**
 * AuthGuard component that protects routes based on authentication state
 * @param requireAuth - If true, redirects unauthenticated users to login
 * @param redirectTo - Custom redirect path (default: '/login')
 */
export function AuthGuard({ 
  children, 
  requireAuth = true,
  redirectTo = '/login' 
}: AuthGuardProps) {
  const { user, isLoading } = useAuthContext();
  const router = useRouter();
  const pathname = usePathname();

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/signup'];
  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    // Don't redirect while loading
    if (isLoading) return;

    // If route requires auth but user is not authenticated
    if (requireAuth && !user && !isPublicRoute) {
      router.push(redirectTo);
      return;
    }

    // If user is authenticated and trying to access auth pages, redirect to home
    if (user && isPublicRoute) {
      router.push('/');
      return;
    }
  }, [user, isLoading, requireAuth, isPublicRoute, router, redirectTo, pathname]);

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If route requires auth but user is not authenticated, show nothing (redirecting)
  if (requireAuth && !user && !isPublicRoute) {
    return null;
  }

  // If user is authenticated and on auth pages, show nothing (redirecting)
  if (user && isPublicRoute) {
    return null;
  }

  return <>{children}</>;
}

