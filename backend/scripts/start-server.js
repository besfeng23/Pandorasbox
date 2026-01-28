const path = require('path');
const fs = require('fs');

// Script to reliably start the Next.js standalone server
// irrespective of the current working directory (cwd).
// This is necessary because Firebase App Hosting / Cloud Run
// might start the container with cwd set to /workspace or /workspace/backend.

console.log(`[Start] Script loaded from ${__filename}`);
console.log(`[Start] CWD is ${process.cwd()}`);

// Define possible locations for server.js
// The deploy folder is created by post-build-fix.js
const candidates = [
    // 1. In deploy/backend/server.js (Expected for monorepo structure)
    path.resolve(__dirname, '../deploy/backend/server.js'),
    // 2. In deploy/server.js (If flattened)
    path.resolve(__dirname, '../deploy/server.js'),
    // 3. Fallback to .next/standalone/backend/server.js
    path.resolve(__dirname, '../.next/standalone/backend/server.js'),
    // 4. Fallback to .next/standalone/server.js
    path.resolve(__dirname, '../.next/standalone/server.js')
];

let serverPath = null;

for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
        serverPath = candidate;
        console.log(`[Start] Found server at ${serverPath}`);
        break;
    }
}

if (serverPath) {
    // Ensure HOSTNAME is 0.0.0.0 for Cloud Run
    process.env.HOSTNAME = '0.0.0.0';

    // Hand over control to the Next.js server
    try {
        require(serverPath);
    } catch (e) {
        console.error(`[Start] ❌ Failed to require server file: ${e.message}`);
        console.error(e.stack);
        process.exit(1);
    }
} else {
    console.error(`[Start] ❌ Server file not found in any candidate location.`);
    console.error(`[Start] Searched:`, candidates);

    // Debug: List directory contents of deploy
    try {
        const deployDir = path.resolve(__dirname, '../deploy');
        if (fs.existsSync(deployDir)) {
            console.log(`[Start] Contents of ${deployDir}:`, fs.readdirSync(deployDir));
            // Check backend subdir
            const backendSub = path.join(deployDir, 'backend');
            if (fs.existsSync(backendSub)) {
                console.log(`[Start] Contents of ${backendSub}:`, fs.readdirSync(backendSub));
            }
        } else {
            console.log(`[Start] Directory ${deployDir} does not exist.`);
        }
    } catch (e) {
        console.error('[Start] Failed to list directories', e);
    }

    process.exit(1);
}
