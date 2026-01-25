
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseClientProvider } from '@/firebase';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';
import { SidebarProvider } from '@/components/ui/sidebar';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FirebaseClientProvider>
        <SidebarProvider>
          {children}
          <Toaster />
        </SidebarProvider>
      </FirebaseClientProvider>
    </ThemeProvider>
  );
}
