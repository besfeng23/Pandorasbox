/**
 * Interactive Base44 Sync
 * 
 * Prompts for credentials and runs the sync
 */

import * as readline from 'readline';

function question(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

async function runInteractiveSync() {
  console.log('🔐 Base44 Sync - Credential Setup\n');

  // Check if already set
  if (process.env.BASE44_APP_ID && process.env.BASE44_API_KEY) {
    console.log('✅ Credentials found in environment variables\n');
    const useExisting = await question('Use existing credentials? (y/n): ');
    if (useExisting.toLowerCase() === 'y' || useExisting.toLowerCase() === 'yes') {
      console.log('\n🔄 Running sync with existing credentials...\n');
      const { syncBase44WithKairos } = await import('./base44-sync');
      await syncBase44WithKairos({ verbose: true });
      return;
    }
  }

  // Get credentials
  const appId = await question('Enter Base44 App ID: ');
  const apiKey = await question('Enter Base44 API Key: ');
  const apiUrl = await question('Enter Base44 API URL (default: https://kairostrack.base44.app): ') || 'https://kairostrack.base44.app';

  if (!appId || !apiKey) {
    console.error('❌ App ID and API Key are required');
    process.exit(1);
  }

  // Set environment variables
  process.env.BASE44_APP_ID = appId.trim();
  process.env.BASE44_API_KEY = apiKey.trim();
  process.env.BASE44_API_URL = apiUrl.trim();

  console.log('\n🔄 Running sync...\n');

  // Import and run sync (after setting env vars)
  try {
    const { syncBase44WithKairos } = await import('./base44-sync');
    await syncBase44WithKairos({ verbose: true });
  } catch (error: any) {
    console.error('❌ Sync failed:', error.message);
    process.exit(1);
  }
}

runInteractiveSync().catch(console.error);

