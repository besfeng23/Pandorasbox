import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Match ALL API routes
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET,DELETE,PATCH,POST,PUT,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version" },
        ]
      }
    ]
  },
  reactStrictMode: true,
  // App Hosting handles standalone automatically, but explicit is fine
  output: "standalone",
  
  /* config options here */

  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: false,
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
    // experimental.after is no longer needed in Next.js 15
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
