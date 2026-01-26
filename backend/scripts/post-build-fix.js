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
const currentWorkingDir = process.cwd();

// Try to find .next directory - it should be in the same directory as package.json
// Check multiple possible locations
let backendDir = null;
let nextDir = null;
let routesManifestPath = null;

// Strategy 1: If script is in backend/scripts/, backend is one level up
if (scriptDir.includes('/backend/scripts') || scriptDir.includes('\\backend\\scripts')) {
  backendDir = path.resolve(scriptDir, '..');
  nextDir = path.join(backendDir, '.next');
  routesManifestPath = path.join(nextDir, 'routes-manifest.json');
  if (fs.existsSync(routesManifestPath)) {
    console.log('[Post-build] Found .next directory using script location strategy');
  } else {
    backendDir = null;
  }
}

// Strategy 2: Check if .next exists in current working directory
if (!backendDir || !fs.existsSync(routesManifestPath)) {
  const cwdNextDir = path.join(currentWorkingDir, '.next');
  const cwdRoutesManifest = path.join(cwdNextDir, 'routes-manifest.json');
  if (fs.existsSync(cwdRoutesManifest)) {
    backendDir = currentWorkingDir;
    nextDir = cwdNextDir;
    routesManifestPath = cwdRoutesManifest;
    console.log('[Post-build] Found .next directory using current working directory strategy');
  }
}

// Strategy 3: Check if .next exists one level up from script (if script is in scripts/)
if (!backendDir || !fs.existsSync(routesManifestPath)) {
  const parentDir = path.resolve(scriptDir, '..');
  const parentNextDir = path.join(parentDir, '.next');
  const parentRoutesManifest = path.join(parentNextDir, 'routes-manifest.json');
  if (fs.existsSync(parentRoutesManifest)) {
    backendDir = parentDir;
    nextDir = parentNextDir;
    routesManifestPath = parentRoutesManifest;
    console.log('[Post-build] Found .next directory using parent directory strategy');
  }
}

// Fallback: Use script directory's parent
if (!backendDir) {
  backendDir = path.resolve(scriptDir, '..');
  nextDir = path.join(backendDir, '.next');
  routesManifestPath = path.join(nextDir, 'routes-manifest.json');
  console.log('[Post-build] Using fallback: script directory parent');
}

// Get workspace root (one level up from backend) - but be careful if it's root
const workspaceRoot = path.resolve(backendDir, '..');

console.log('[Post-build] Fixing routes-manifest.json location for Firebase App Hosting...');
console.log(`[Post-build] Script dir: ${scriptDir}`);
console.log(`[Post-build] Current working dir: ${currentWorkingDir}`);
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
  // Safety check: don't allow root directory or paths that resolve to root
  const normalizedBaseDir = path.resolve(targetBaseDir);
  if (normalizedBaseDir === '/' || normalizedBaseDir === path.sep || normalizedBaseDir.length <= 1) {
    console.warn(`[Post-build] ⚠️  Skipping ${locationName} - target directory is root or unsafe (${normalizedBaseDir})`);
    return false;
  }
  
  const standaloneDir = path.join(targetBaseDir, '.next', 'standalone');
  const targetDir = path.join(standaloneDir, '.next');
  const targetManifestPath = path.join(targetDir, 'routes-manifest.json');
  
  // Additional safety check: ensure target path is not at root
  const normalizedTargetDir = path.resolve(targetDir);
  if (normalizedTargetDir.startsWith('/.next') || normalizedTargetDir === '/.next' || normalizedTargetDir.length <= 6) {
    console.warn(`[Post-build] ⚠️  Skipping ${locationName} - target path is unsafe (${normalizedTargetDir})`);
    return false;
  }
  
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

// Copy to backend location (required)
const backendSuccess = copyToLocation(backendDir, 'Backend');

// Only copy to workspace root if it's safe (optional)
// CRITICAL: Never attempt to copy to root directory - it will cause permission errors
let workspaceSuccess = false;
const normalizedWorkspaceRoot = path.resolve(workspaceRoot);

// Explicit check: if workspace root is root filesystem, skip it entirely
if (normalizedWorkspaceRoot === '/' || normalizedWorkspaceRoot === path.sep || normalizedWorkspaceRoot.length <= 1) {
  console.warn(`[Post-build] ⚠️  Skipping workspace root copy - path resolves to root filesystem (${normalizedWorkspaceRoot})`);
  console.warn(`[Post-build] This is safe - the adapter will use the backend location instead.`);
  workspaceSuccess = false; // Explicitly set to false
} else {
  // Additional safety: check if the target path would be at root level
  const potentialTargetPath = path.resolve(workspaceRoot, '.next', 'standalone', '.next');
  if (potentialTargetPath.startsWith('/.next') || potentialTargetPath === '/.next' || potentialTargetPath.length <= 6) {
    console.warn(`[Post-build] ⚠️  Skipping workspace root copy - target path would be unsafe (${potentialTargetPath})`);
    workspaceSuccess = false;
  } else {
    workspaceSuccess = copyToLocation(workspaceRoot, 'Workspace root');
  }
}

// Only require backend location to succeed (workspace root is optional)
if (!backendSuccess) {
  console.error(`[Post-build] ❌ Failed to copy routes-manifest.json to backend location`);
  process.exit(1);
}

if (!workspaceSuccess) {
  console.warn(`[Post-build] ⚠️  Warning: Skipped workspace root copy (unsafe path), but backend copy succeeded.`);
  console.warn(`[Post-build] This is okay - the adapter should use the backend location.`);
}

console.log(`[Post-build] ✅ Post-build fix completed!`);

