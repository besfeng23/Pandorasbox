#!/usr/bin/env node
/**
 * Post-build script to fix Firebase App Hosting adapter path issues
 * The adapter looks for manifest files at .next/standalone/.next/
 * but Next.js places them at .next/
 * 
 * This script copies all required manifest files to where the adapter expects them.
 */

const fs = require('fs');
const path = require('path');

// List of manifest files needed by the Firebase App Hosting adapter
const MANIFEST_FILES = [
  'routes-manifest.json',
  'build-manifest.json',
  'prerender-manifest.json',
  'app-build-manifest.json',
  'react-loadable-manifest.json',
];

// Server-side manifest files
const SERVER_MANIFEST_FILES = [
  'server/middleware-manifest.json',
  'server/middleware-build-manifest.js',
  'server/app/page_client-reference-manifest.js',
];

const scriptDir = __dirname;
const currentWorkingDir = process.cwd();

// Try to find .next directory
let backendDir = null;
let nextDir = null;

// Strategy 1: If script is in backend/scripts/, backend is one level up
if (scriptDir.includes('/backend/scripts') || scriptDir.includes('\\backend\\scripts')) {
  backendDir = path.resolve(scriptDir, '..');
  nextDir = path.join(backendDir, '.next');
  if (fs.existsSync(nextDir)) {
    console.log('[Post-build] Found .next directory using script location strategy');
  } else {
    backendDir = null;
  }
}

// Strategy 2: Check if .next exists in current working directory
if (!backendDir) {
  const cwdNextDir = path.join(currentWorkingDir, '.next');
  if (fs.existsSync(cwdNextDir)) {
    backendDir = currentWorkingDir;
    nextDir = cwdNextDir;
    console.log('[Post-build] Found .next directory using current working directory strategy');
  }
}

// Strategy 3: Use script directory's parent
if (!backendDir) {
  backendDir = path.resolve(scriptDir, '..');
  nextDir = path.join(backendDir, '.next');
  console.log('[Post-build] Using fallback: script directory parent');
}

const workspaceRoot = path.resolve(backendDir, '..');

console.log('[Post-build] Fixing manifest files for Firebase App Hosting...');
console.log(`[Post-build] Script dir: ${scriptDir}`);
console.log(`[Post-build] Current working dir: ${currentWorkingDir}`);
console.log(`[Post-build] Backend dir: ${backendDir}`);
console.log(`[Post-build] Workspace root: ${workspaceRoot}`);
console.log(`[Post-build] Next dir: ${nextDir}`);

// Check if .next directory exists
if (!fs.existsSync(nextDir)) {
  console.warn(`[Post-build] ⚠️  Warning: .next directory not found at ${nextDir}`);
  console.warn(`[Post-build] This is normal during build phase.`);
  process.exit(0);
}

// Copy a single file to target location
const copyFile = (sourceFile, targetFile) => {
  try {
    // Create target directory if it doesn't exist
    const targetDir = path.dirname(targetFile);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    fs.copyFileSync(sourceFile, targetFile);
    console.log(`[Post-build] ✅ Copied ${path.basename(sourceFile)}`);
    return true;
  } catch (error) {
    console.warn(`[Post-build] ⚠️  Could not copy ${path.basename(sourceFile)}: ${error.message}`);
    return false;
  }
};

// Copy manifests to a target location
const copyManifestsToLocation = (targetBaseDir, locationName) => {
  const normalizedBaseDir = path.resolve(targetBaseDir);
  if (normalizedBaseDir === '/' || normalizedBaseDir === path.sep || normalizedBaseDir.length <= 1) {
    console.warn(`[Post-build] ⚠️  Skipping ${locationName} - target directory is root or unsafe`);
    return false;
  }

  const targetStandaloneNextDir = path.join(targetBaseDir, '.next', 'standalone', '.next');
  console.log(`[Post-build] Copying manifests to ${locationName}: ${targetStandaloneNextDir}`);

  let successCount = 0;

  // Copy root manifest files
  for (const file of MANIFEST_FILES) {
    const sourceFile = path.join(nextDir, file);
    const targetFile = path.join(targetStandaloneNextDir, file);

    if (fs.existsSync(sourceFile)) {
      if (copyFile(sourceFile, targetFile)) {
        successCount++;
      }
    }
  }

  // Copy server manifest files
  for (const file of SERVER_MANIFEST_FILES) {
    const sourceFile = path.join(nextDir, file);
    const targetFile = path.join(targetStandaloneNextDir, file);

    if (fs.existsSync(sourceFile)) {
      if (copyFile(sourceFile, targetFile)) {
        successCount++;
      }
    }
  }

  // Copy entire server directory if it exists (for middleware and other server files)
  const serverDir = path.join(nextDir, 'server');
  const targetServerDir = path.join(targetStandaloneNextDir, 'server');
  if (fs.existsSync(serverDir)) {
    try {
      if (!fs.existsSync(targetServerDir)) {
        fs.mkdirSync(targetServerDir, { recursive: true });
      }
      // Copy middleware-manifest.json specifically
      const middlewareManifest = path.join(serverDir, 'middleware-manifest.json');
      if (fs.existsSync(middlewareManifest)) {
        copyFile(middlewareManifest, path.join(targetServerDir, 'middleware-manifest.json'));
      }
    } catch (error) {
      console.warn(`[Post-build] ⚠️  Could not copy server directory: ${error.message}`);
    }
  }

  console.log(`[Post-build] ${locationName}: Copied ${successCount} manifest files`);
  return successCount > 0;
};

// Copy to backend location
const backendSuccess = copyManifestsToLocation(backendDir, 'Backend');

// Copy to workspace root (required by the adapter)
let workspaceSuccess = false;
if (workspaceRoot && workspaceRoot !== backendDir) {
  workspaceSuccess = copyManifestsToLocation(workspaceRoot, 'Workspace Root');

  // Copy the standalone directory to workspace root
  const sourceStandaloneDir = path.join(nextDir, 'standalone');
  const targetStandaloneDir = path.join(workspaceRoot, '.next', 'standalone');

  if (fs.existsSync(sourceStandaloneDir)) {
    console.log(`[Post-build] Copying standalone directory to workspace root: ${targetStandaloneDir}`);
    try {
      // Use fs.cpSync for robust recursive copying (Node 16.7+)
      // This handles symlinks and permissions much better than manual recursion
      fs.cpSync(sourceStandaloneDir, targetStandaloneDir, {
        recursive: true,
        dereference: true, // Follow symlinks to ensure files are actually present
        errorOnExist: false,
        force: true
      });
      console.log(`[Post-build] ✅ Copied standalone directory to workspace root`);

      // Verify and fix missing modules in standalone
      const criticalModules = ['next', 'react', 'react-dom', 'sharp'];
      const sourceNodeModules = path.join(backendDir, 'node_modules');
      const rootNodeModules = path.join(workspaceRoot, 'node_modules');
      const targetNodeModules = path.join(targetStandaloneDir, 'node_modules');

      // Ensure target node_modules exists
      if (!fs.existsSync(targetNodeModules)) {
        fs.mkdirSync(targetNodeModules, { recursive: true });
      }

      criticalModules.forEach(mod => {
        const targetModPath = path.join(targetNodeModules, mod);
        if (!fs.existsSync(targetModPath)) {
          console.warn(`[Post-build] ⚠️  Module '${mod}' missing in standalone. Checking sources...`);

          let sourceModPath = path.join(sourceNodeModules, mod);
          if (!fs.existsSync(sourceModPath)) {
            // Try root
            sourceModPath = path.join(rootNodeModules, mod);
          }

          if (fs.existsSync(sourceModPath)) {
            try {
              fs.cpSync(sourceModPath, targetModPath, {
                recursive: true,
                dereference: true,
                force: true
              });
              console.log(`[Post-build] ✅ Copied '${mod}' to standalone node_modules`);
            } catch (err) {
              console.error(`[Post-build] ❌ Failed to copy '${mod}':`, err);
            }
          } else {
            console.error(`[Post-build] ❌ Module '${mod}' not found in backend or root node_modules`);
          }
        } else {
          console.log(`[Post-build] ✅ Verified '${mod}' exists in standalone`);
        }
      });

      // Verify server.js
      const serverJsPath = path.join(targetStandaloneDir, 'server.js');
      if (fs.existsSync(serverJsPath)) {
        console.log(`[Post-build] ✅ Verified 'server.js' exists at ${serverJsPath}`);
      } else {
        console.error(`[Post-build] ❌ 'server.js' NOT found at ${serverJsPath}`);
        // List directory
        try {
          const files = fs.readdirSync(targetStandaloneDir);
          console.log('[Post-build] Standalone directory contents:', files);
        } catch (e) { }
      }
    } catch (error) {
      console.warn(`[Post-build] ⚠️  Could not copy standalone directory: ${error.message}`);

      // Fallback to manual copy if cpSync fails for some reason
      if (error.code === 'ERR_FS_CP_SYMLINK_TO_SUBDIRECTORY') {
        console.log('[Post-build] Retrying with symlinks ignored...');
        try {
          fs.cpSync(sourceStandaloneDir, targetStandaloneDir, {
            recursive: true,
            dereference: false,
            filter: (src) => !fs.lstatSync(src).isSymbolicLink()
          });
        } catch (e) {
          console.error(`[Post-build] ❌ Fallback also failed: ${e.message}`);
        }
      }
    }
  } else {
    console.warn(`[Post-build] ⚠️  Standalone directory not found at ${sourceStandaloneDir}`);
  }

  // Also copy the static folder to workspace root
  const sourceStaticDir = path.join(nextDir, 'static');
  const targetStaticDir = path.join(workspaceRoot, '.next', 'static');

  if (fs.existsSync(sourceStaticDir)) {
    console.log(`[Post-build] Copying static folder to workspace root: ${targetStaticDir}`);
    try {
      fs.cpSync(sourceStaticDir, targetStaticDir, { recursive: true, force: true });
      console.log(`[Post-build] ✅ Copied static folder to workspace root`);
    } catch (error) {
      console.warn(`[Post-build] ⚠️  Could not copy static folder: ${error.message}`);
    }
  } else {
    console.warn(`[Post-build] ⚠️  Static folder not found at ${sourceStaticDir}`);
  }
}

// Log result
if (backendSuccess || workspaceSuccess) {
  console.log(`[Post-build] ✅ Post-build fix completed!`);
} else {
  console.error(`[Post-build] ❌ Failed to copy manifest files`);
  process.exit(1);
}
