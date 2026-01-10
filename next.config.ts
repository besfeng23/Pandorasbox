import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // App Hosting handles standalone automatically, but explicit is fine
  output: "standalone",
  
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Important for Firebase Image support if you use <Image>
  images: {
    unoptimized: true,
    remotePatterns: [
      { hostname: 'firebasestorage.googleapis.com' },
      { hostname: 'storage.googleapis.com' },
      { hostname: 'oaidalleapiprodscus.blob.core.windows.net' },
      { hostname: 'placehold.co' },
      { hostname: 'images.unsplash.com' },
      { hostname: 'picsum.photos' },
    ],
  },
  
  // Experimental features for the Async Nervous System
  experimental: {
    // Enable if using unstable_after() for background tasks on Cloud Run
    after: true, 
  },

  env: {
    NEXT_PUBLIC_FIREBASE_API_KEY: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    NEXT_PUBLIC_FIREBASE_PROJECT_ID: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    NEXT_PUBLIC_FIREBASE_APP_ID: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
    NEXT_PUBLIC_BUILD_VERSION: "v2.0.0"
  }
};

export default nextConfig;
