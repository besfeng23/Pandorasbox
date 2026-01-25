
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { AuthProvider } from '@/components/auth/auth-context';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <SidebarProvider>
          {children}
          <Toaster />
        </SidebarProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
