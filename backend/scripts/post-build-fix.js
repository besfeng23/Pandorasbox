#!/usr/bin/env node
/**
 * Post-build script to fix Firebase App Hosting adapter path issues
 * The adapter looks for routes-manifest.json at .next/standalone/.next/routes-manifest.json
 * but Next.js places it at .next/routes-manifest.json
 * 
 * This script copies the routes-manifest.json to where the adapter expects it.
 */

const fs = require('fs');
const path = require('path');

// Get the backend directory (where this script runs from)
const backendDir = process.cwd();
// Get workspace root (one level up from backend)
const workspaceRoot = path.resolve(backendDir, '..');
const nextDir = path.join(backendDir, '.next');
const routesManifestPath = path.join(nextDir, 'routes-manifest.json');

console.log('[Post-build] Fixing routes-manifest.json location for Firebase App Hosting...');
console.log(`[Post-build] Backend dir: ${backendDir}`);
console.log(`[Post-build] Workspace root: ${workspaceRoot}`);
console.log(`[Post-build] Source: ${routesManifestPath}`);

// Check if source exists
if (!fs.existsSync(routesManifestPath)) {
  console.warn(`[Post-build] ⚠️  Warning: routes-manifest.json not found at ${routesManifestPath}`);
  console.warn(`[Post-build] This is normal during build phase, but should exist after Next.js build completes.`);
  process.exit(0);
}

// The adapter looks for routes-manifest.json in TWO locations:
// 1. /workspace/backend/.next/standalone/.next/routes-manifest.json (backend standalone)
// 2. /workspace/.next/standalone/.next/routes-manifest.json (workspace root - what adapter actually uses)

const copyToLocation = (targetBaseDir, locationName) => {
  const standaloneDir = path.join(targetBaseDir, '.next', 'standalone');
  const targetDir = path.join(standaloneDir, '.next');
  const targetManifestPath = path.join(targetDir, 'routes-manifest.json');
  
  console.log(`[Post-build] ${locationName} target: ${targetManifestPath}`);
  
  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    console.log(`[Post-build] Creating directory: ${targetDir}`);
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  // Copy the file
  try {
    fs.copyFileSync(routesManifestPath, targetManifestPath);
    console.log(`[Post-build] ✅ Successfully copied to ${locationName}`);
    
    // Verify the copy was successful
    if (fs.existsSync(targetManifestPath)) {
      console.log(`[Post-build] ✅ Verification: ${locationName} file exists`);
      return true;
    } else {
      console.error(`[Post-build] ❌ Verification failed: ${locationName} file does not exist`);
      return false;
    }
  } catch (error) {
    console.error(`[Post-build] ❌ Failed to copy to ${locationName}:`, error);
    return false;
  }
};

// Copy to both locations
const backendSuccess = copyToLocation(backendDir, 'Backend');
const workspaceSuccess = copyToLocation(workspaceRoot, 'Workspace root');

if (!backendSuccess || !workspaceSuccess) {
  console.error(`[Post-build] ❌ Failed to copy routes-manifest.json to all required locations`);
  process.exit(1);
}

console.log(`[Post-build] ✅ All copies successful!`);

