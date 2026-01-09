import type {Metadata, Viewport} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { CommandMenu } from '@/components/command-menu';
import { ThemeProvider } from '@/hooks/use-theme';
import { NotificationProvider } from '@/components/notification-provider';

export const metadata: Metadata = {
  title: 'PandorasBox - AI-Powered Memory',
  description: 'An AI-powered chat application with persistent long-term memory. Digital Void interface.',
  manifest: "/manifest.json",
  keywords: ['AI', 'Chat', 'Memory', 'PandorasBox'],
  authors: [{ name: 'PandorasBox Team' }],
  creator: 'PandorasBox',
  publisher: 'PandorasBox',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Pandora",
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    title: 'PandorasBox',
    description: 'AI-powered chat with persistent memory',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PandorasBox',
    description: 'AI-powered chat with persistent memory',
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  userScalable: true, // Allow zoom for accessibility
  viewportFit: 'cover', // Support notched devices
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <html lang="en" style={{ height: '100%' }} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link
          rel="icon"
          type="image/png"
          href="https://firebasestorage.googleapis.com/v0/b/seismic-vista-480710-q5.firebasestorage.app/o/cube2.png?alt=media&token=7bdcae2f-86f8-462f-abaf-9b1cc98cb6c1"
        />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className="font-body antialiased bg-black text-white" style={{ minHeight: '100dvh', overflowY: 'auto' }}>
        <ThemeProvider>
          <FirebaseClientProvider>
            <NotificationProvider>
              {children}
              <CommandMenu />
            </NotificationProvider>
          </FirebaseClientProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
