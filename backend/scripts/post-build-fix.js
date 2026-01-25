#!/usr/bin/env node
/**
 * Post-build script to fix Firebase App Hosting adapter path issues
 * The adapter looks for routes-manifest.json at .next/standalone/.next/routes-manifest.json
 * but Next.js places it at .next/routes-manifest.json
 */

const fs = require('fs');
const path = require('path');

// Get the backend directory (where this script runs from)
const backendDir = process.cwd();
const nextDir = path.join(backendDir, '.next');
const routesManifestPath = path.join(nextDir, 'routes-manifest.json');
const standaloneDir = path.join(nextDir, 'standalone');

console.log('[Post-build] Fixing routes-manifest.json location for Firebase App Hosting...');
console.log(`[Post-build] Backend dir: ${backendDir}`);
console.log(`[Post-build] Source: ${routesManifestPath}`);

// Check if source exists
if (!fs.existsSync(routesManifestPath)) {
  console.warn(`[Post-build] ⚠️  Warning: routes-manifest.json not found at ${routesManifestPath}`);
  console.warn(`[Post-build] This is normal during build phase, but should exist after Next.js build completes.`);
  process.exit(0);
}

// The adapter looks for: .next/standalone/.next/routes-manifest.json
// We need to create the nested .next directory inside standalone
const targetDir = path.join(standaloneDir, '.next');
const targetManifestPath = path.join(targetDir, 'routes-manifest.json');

console.log(`[Post-build] Target: ${targetManifestPath}`);

// Create target directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
  console.log(`[Post-build] Creating directory: ${targetDir}`);
  fs.mkdirSync(targetDir, { recursive: true });
}

// Copy the file
try {
  fs.copyFileSync(routesManifestPath, targetManifestPath);
  console.log(`[Post-build] ✅ Successfully copied routes-manifest.json`);
  console.log(`[Post-build]    From: ${routesManifestPath}`);
  console.log(`[Post-build]    To:   ${targetManifestPath}`);
} catch (error) {
  console.error(`[Post-build] ❌ Failed to copy routes-manifest.json:`, error);
  process.exit(1);
}

