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
    // 2. In deploy/app/server.js (Alternative monorepo name)
    path.resolve(__dirname, '../deploy/app/server.js'),
    // 3. In deploy/server.js (If flattened)
    path.resolve(__dirname, '../deploy/server.js'),
    // 4. Fallback to .next/standalone/backend/server.js
    path.resolve(__dirname, '../.next/standalone/backend/server.js'),
    // 5. Fallback to .next/standalone/app/server.js
    path.resolve(__dirname, '../.next/standalone/app/server.js'),
    // 6. Fallback to .next/standalone/server.js
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

    // Debug: List directory contents recursively to find where server.js is hiding
    try {
        const listDirRecursive = (dir, depth = 0) => {
            if (depth > 3) return;
            if (!fs.existsSync(dir)) return;
            const files = fs.readdirSync(dir);
            console.log(`[Start] [Depth ${depth}] Contents of ${dir}:`, files);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    listDirRecursive(fullPath, depth + 1);
                }
            }
        };
        console.log('[Start] 🔍 Deep filesystem audit of /app:');
        listDirRecursive('/app');
    } catch (e) {
        console.error('[Start] Failed to perform deep audit', e);
    }

    process.exit(1);
}
