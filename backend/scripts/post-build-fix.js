#!/usr/bin/env node
/**
 * Post-build script to fix Firebase App Hosting adapter path issues
 * Also prepares the 'deploy' directory for reliable container startup.
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
    // STEP 1: Fix critical modules in the SOURCE standalone directory first
    console.log('[Post-build] Fixing modules in source standalone directory...');

    // Read dependencies from package.json to identify what needs to be fixed
    let projectDependencies = [];
    try {
      const packageJsonPath = path.join(backendDir, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        projectDependencies = Object.keys(packageJson.dependencies || {});
        console.log(`[Post-build] Found ${projectDependencies.length} dependencies in package.json to verify/fix.`);
      }
    } catch (e) {
      console.warn(`[Post-build] ⚠️ Failed to read package.json dependencies: ${e.message}`);
    }

    // Default Critical + All Project Dependencies
    const modulesToFix = [...new Set(['next', 'react', 'react-dom', 'sharp', ...projectDependencies])];

    const sourceNodeModules = path.join(backendDir, 'node_modules'); // Original modules
    const rootNodeModules = path.join(workspaceRoot, 'node_modules');
    const standaloneNodeModules = path.join(sourceStandaloneDir, 'node_modules');

    if (!fs.existsSync(standaloneNodeModules)) {
      fs.mkdirSync(standaloneNodeModules, { recursive: true });
    }

    modulesToFix.forEach(mod => {
      const standaloneModPath = path.join(standaloneNodeModules, mod);
      let srcPath = path.join(sourceNodeModules, mod);
      if (!fs.existsSync(srcPath)) {
        srcPath = path.join(rootNodeModules, mod);
      }

      if (fs.existsSync(srcPath)) {
        try {
          // Force copy dereferenced to ensure real files replace any symlinks
          fs.cpSync(srcPath, standaloneModPath, { recursive: true, dereference: true, force: true });
          // console.log(`[Post-build] ✅ Fixed '${mod}' in source standalone`);
        } catch (e) {
          // Ignore errors mostly
        }
      }
    });

    // STEP 1.5: Populate source standalone with static assets
    const sourceStaticDir = path.join(nextDir, 'static');
    const standaloneStaticDir = path.join(sourceStandaloneDir, '.next', 'static');
    if (fs.existsSync(sourceStaticDir)) {
      try {
        fs.mkdirSync(path.dirname(standaloneStaticDir), { recursive: true });
        fs.cpSync(sourceStaticDir, standaloneStaticDir, { recursive: true, force: true });
        console.log('[Post-build] ✅ Populated source standalone with static assets');
      } catch (e) { console.error(e); }
    }

    const sourcePublicDir = path.join(backendDir, 'public');
    const standalonePublicDir = path.join(sourceStandaloneDir, 'public');
    if (fs.existsSync(sourcePublicDir)) {
      try {
        fs.cpSync(sourcePublicDir, standalonePublicDir, { recursive: true, force: true });
        console.log('[Post-build] ✅ Populated source standalone with public assets');
      } catch (e) { console.error(e); }
    }

    // STEP 1.5.1: Ensure server.js exists at root of source standalone (Proxy)
    const sourceRootServerJs = path.join(sourceStandaloneDir, 'server.js');
    const sourceBackendServerJs = path.join(sourceStandaloneDir, 'backend', 'server.js');

    if (!fs.existsSync(sourceRootServerJs) && fs.existsSync(sourceBackendServerJs)) {
      console.log('[Post-build] Creating proxy server.js for source standalone...');
      fs.writeFileSync(sourceRootServerJs, "require('./backend/server.js');");
      console.log('[Post-build] ✅ Created source proxy server.js');
    }

    // STEP 1.6: Copy to backend/deploy (The runtime location) which is NOT ignored
    const deployDir = path.join(backendDir, 'deploy');
    console.log(`[Post-build] Copying standalone to deployment directory: ${deployDir}`);
    if (fs.existsSync(deployDir)) {
      fs.rmSync(deployDir, { recursive: true, force: true });
    }
    fs.mkdirSync(deployDir, { recursive: true });
    fs.cpSync(sourceStandaloneDir, deployDir, { recursive: true, dereference: true, force: true });
    console.log(`[Post-build] ✅ Copied standalone to ${deployDir}`);

    // STEP 2: Copy the fixed standalone directory to workspace root (for Adapter detection)
    try {
      fs.cpSync(sourceStandaloneDir, targetStandaloneDir, {
        recursive: true,
        dereference: true,
        errorOnExist: false,
        force: true
      });
      console.log(`[Post-build] ✅ Copied fixed standalone directory to workspace root`);

      // STEP 3: Ensure server.js exists at root of standalone (Proxy for Monorepo structure)
      const rootServerJs = path.join(targetStandaloneDir, 'server.js');
      const backendServerJs = path.join(targetStandaloneDir, 'backend', 'server.js');

      if (!fs.existsSync(rootServerJs) && fs.existsSync(backendServerJs)) {
        console.log('[Post-build] Creating proxy server.js for monorepo structure...');
        fs.writeFileSync(rootServerJs, "require('./backend/server.js');");
        console.log('[Post-build] ✅ Created proxy server.js');
      }
    } catch (error) {
      console.warn(`[Post-build] ⚠️ Could not copy standalone to workspace root: ${error.message}`);
    }
  } else {
    console.warn(`[Post-build] ⚠️  Standalone directory not found so skipping deployment prep`);
  }

  // Also copy the static folder to workspace root (for adapter backup)
  const sourceStaticDir = path.join(nextDir, 'static');
  const targetStaticDir = path.join(workspaceRoot, '.next', 'static');

  if (fs.existsSync(sourceStaticDir)) {
    try {
      fs.cpSync(sourceStaticDir, targetStaticDir, { recursive: true, force: true });
    } catch (error) {
      console.warn(`[Post-build] ⚠️  Could not copy static folder: ${error.message}`);
    }
  }
}

// Log result
if (backendSuccess || workspaceSuccess) {
  console.log(`[Post-build] ✅ Post-build fix completed!`);
} else {
  console.error(`[Post-build] ❌ Failed to copy manifest files`);
  process.exit(1);
}
