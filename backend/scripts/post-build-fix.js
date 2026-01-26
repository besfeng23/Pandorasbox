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

// Get the backend directory - use __dirname to get the script's directory, then go up one level
// This is more reliable than process.cwd() in containerized environments
const scriptDir = __dirname;
const backendDir = path.resolve(scriptDir, '..');
// Get workspace root (one level up from backend)
const workspaceRoot = path.resolve(backendDir, '..');
const nextDir = path.join(backendDir, '.next');
const routesManifestPath = path.join(nextDir, 'routes-manifest.json');

console.log('[Post-build] Fixing routes-manifest.json location for Firebase App Hosting...');
console.log(`[Post-build] Script dir: ${scriptDir}`);
console.log(`[Post-build] Backend dir: ${backendDir}`);
console.log(`[Post-build] Workspace root: ${workspaceRoot}`);
console.log(`[Post-build] Source: ${routesManifestPath}`);

// Validate that backendDir is not root (safety check)
if (backendDir === '/' || backendDir === path.sep) {
  console.error(`[Post-build] ❌ ERROR: Backend directory resolved to root (${backendDir}). This is unsafe.`);
  console.error(`[Post-build] Using script directory instead.`);
  // Fallback: use script directory as backend directory
  const fallbackBackendDir = path.resolve(scriptDir, '..');
  if (fallbackBackendDir === '/' || fallbackBackendDir === path.sep) {
    console.error(`[Post-build] ❌ ERROR: Fallback also resolved to root. Aborting.`);
    process.exit(1);
  }
  // Recalculate paths with fallback
  const fallbackNextDir = path.join(fallbackBackendDir, '.next');
  const fallbackRoutesManifestPath = path.join(fallbackNextDir, 'routes-manifest.json');
  
  // Check if source exists
  if (!fs.existsSync(fallbackRoutesManifestPath)) {
    console.warn(`[Post-build] ⚠️  Warning: routes-manifest.json not found at ${fallbackRoutesManifestPath}`);
    console.warn(`[Post-build] This is normal during build phase, but should exist after Next.js build completes.`);
    process.exit(0);
  }
  
  // Only copy to backend location (skip workspace root to avoid permission issues)
  const standaloneDir = path.join(fallbackBackendDir, '.next', 'standalone');
  const targetDir = path.join(standaloneDir, '.next');
  const targetManifestPath = path.join(targetDir, 'routes-manifest.json');
  
  console.log(`[Post-build] Target: ${targetManifestPath}`);
  
  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    console.log(`[Post-build] Creating directory: ${targetDir}`);
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (error) {
      console.error(`[Post-build] ❌ Failed to create directory: ${error.message}`);
      process.exit(1);
    }
  }
  
  // Copy the file
  try {
    fs.copyFileSync(fallbackRoutesManifestPath, targetManifestPath);
    console.log(`[Post-build] ✅ Successfully copied routes-manifest.json`);
    
    // Verify the copy was successful
    if (fs.existsSync(targetManifestPath)) {
      console.log(`[Post-build] ✅ Verification: file exists at target location`);
      process.exit(0);
    } else {
      console.error(`[Post-build] ❌ Verification failed: file does not exist at target location`);
      process.exit(1);
    }
  } catch (error) {
    console.error(`[Post-build] ❌ Failed to copy: ${error.message}`);
    process.exit(1);
  }
}

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
  // Safety check: don't allow root directory
  if (targetBaseDir === '/' || targetBaseDir === path.sep) {
    console.warn(`[Post-build] ⚠️  Skipping ${locationName} - target directory is root (unsafe)`);
    return false;
  }
  
  const standaloneDir = path.join(targetBaseDir, '.next', 'standalone');
  const targetDir = path.join(standaloneDir, '.next');
  const targetManifestPath = path.join(targetDir, 'routes-manifest.json');
  
  console.log(`[Post-build] ${locationName} target: ${targetManifestPath}`);
  
  // Create target directory if it doesn't exist
  if (!fs.existsSync(targetDir)) {
    console.log(`[Post-build] Creating directory: ${targetDir}`);
    try {
      fs.mkdirSync(targetDir, { recursive: true });
    } catch (error) {
      console.error(`[Post-build] ❌ Failed to create directory for ${locationName}: ${error.message}`);
      return false;
    }
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
    console.error(`[Post-build] ❌ Failed to copy to ${locationName}: ${error.message}`);
    return false;
  }
};

// Copy to both locations (but skip workspace root if it's unsafe)
const backendSuccess = copyToLocation(backendDir, 'Backend');
const workspaceSuccess = copyToLocation(workspaceRoot, 'Workspace root');

// Only require backend location to succeed (workspace root is optional)
if (!backendSuccess) {
  console.error(`[Post-build] ❌ Failed to copy routes-manifest.json to backend location`);
  process.exit(1);
}

if (!workspaceSuccess) {
  console.warn(`[Post-build] ⚠️  Warning: Failed to copy to workspace root, but backend copy succeeded.`);
  console.warn(`[Post-build] This may be okay if the adapter uses the backend location.`);
}

console.log(`[Post-build] ✅ Post-build fix completed!`);

