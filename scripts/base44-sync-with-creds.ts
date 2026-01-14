/**
 * Base44 Sync with Credentials
 * 
 * Allows passing credentials as arguments or environment variables
 * Usage:
 *   npx tsx scripts/base44-sync-with-creds.ts --app-id <id> --api-key <key>
 *   BASE44_APP_ID=id BASE44_API_KEY=key npx tsx scripts/base44-sync-with-creds.ts
 */

import { syncBase44WithKairos } from './base44-sync';

const args = process.argv.slice(2);

// Parse arguments
let appId: string | undefined;
let apiKey: string | undefined;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--app-id' && args[i + 1]) {
    appId = args[i + 1];
    i++;
  } else if (args[i] === '--api-key' && args[i + 1]) {
    apiKey = args[i + 1];
    i++;
  }
}

// Set environment variables if provided
if (appId) {
  process.env.BASE44_APP_ID = appId;
}
if (apiKey) {
  process.env.BASE44_API_KEY = apiKey;
}

// Check if we have credentials
if (!process.env.BASE44_APP_ID || !process.env.BASE44_API_KEY) {
  console.error('❌ Missing credentials');
  console.error('\nUsage:');
  console.error('  npx tsx scripts/base44-sync-with-creds.ts --app-id <id> --api-key <key>');
  console.error('  # or set environment variables:');
  console.error('  $env:BASE44_APP_ID="id"; $env:BASE44_API_KEY="key"; npx tsx scripts/base44-sync-with-creds.ts');
  process.exit(1);
}

// Import and run sync
import('./base44-sync').then((module) => {
  // The sync script will handle running itself
  // We just need to ensure credentials are set
  console.log('✅ Credentials set, running sync...\n');
}).catch((error) => {
  console.error('Failed to load sync script:', error);
  process.exit(1);
});

