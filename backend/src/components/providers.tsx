
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase';
import { AuthProvider } from '@/lib/auth/AuthContext';
import { AuthGuard } from '@/components/auth/AuthGuard';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FirebaseClientProvider>
        <AuthProvider>
          <AuthGuard requireAuth={false}>
            <SidebarProvider>
              {children}
              <Toaster />
            </SidebarProvider>
          </AuthGuard>
        </AuthProvider>
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}
