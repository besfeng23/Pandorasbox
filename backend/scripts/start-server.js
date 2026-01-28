const path = require('path');
const fs = require('fs');

// Script to reliably start the Next.js standalone server
// irrespective of the current working directory (cwd).
// This is necessary because Firebase App Hosting / Cloud Run
// might start the container with cwd set to /workspace or /workspace/backend.

// This script is located in backend/scripts/
// The deployment artifact is copied to backend/deploy/
const serverPath = path.resolve(__dirname, '../deploy/server.js');

console.log(`[Start] Launching server from ${serverPath}`);
console.log(`[Start] CWD is ${process.cwd()}`);

if (fs.existsSync(serverPath)) {
    // Ensure HOSTNAME is 0.0.0.0 for Cloud Run
    process.env.HOSTNAME = '0.0.0.0';

    // Hand over control to the Next.js server
    require(serverPath);
} else {
    console.error(`[Start] ❌ Server file not found at ${serverPath}`);

    // Debug: List directory contents
    try {
        const deployDir = path.dirname(serverPath);
        if (fs.existsSync(deployDir)) {
            console.log(`[Start] Contents of ${deployDir}:`, fs.readdirSync(deployDir));
        } else {
            console.log(`[Start] Directory ${deployDir} does not exist.`);
            // List parent
            const parent = path.dirname(deployDir);
            console.log(`[Start] Contents of ${parent}:`, fs.readdirSync(parent));
        }
    } catch (e) {
        console.error('[Start] Failed to list directories', e);
    }

    process.exit(1);
}
