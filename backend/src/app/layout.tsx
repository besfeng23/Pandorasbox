import type { Metadata } from 'next';
import './globals.css';
import { cn } from '@/lib/utils';
import { Providers } from '@/components/providers';
import { GoogleAnalytics } from '@next/third-parties/google';

export const metadata: Metadata = {
  title: "Pandora's Box",
  description: 'Your personal AI companion.',
};

import { SafeEnvCheck } from '@/components/safe-env-check';

// ...

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className={cn('font-sans antialiased bg-background tracking-tight max-w-[100vw] overflow-x-hidden selection:bg-white/20')}>
        <Providers>
          <SafeEnvCheck>
            {children}
          </SafeEnvCheck>
        </Providers>
        {process.env.NEXT_PUBLIC_GA_ID && (
          <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
        )}
      </body>
    </html>
  );
}
