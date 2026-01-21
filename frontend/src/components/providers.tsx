
'use client';

import { ThemeProvider } from '@/components/theme-provider';
import { FirebaseProvider } from '@/firebase';
import type { ReactNode } from 'react';
import { Toaster } from '@/components/ui/toaster';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <FirebaseProvider>
        {children}
        <Toaster />
      </FirebaseProvider>
    </ThemeProvider>
  );
}
