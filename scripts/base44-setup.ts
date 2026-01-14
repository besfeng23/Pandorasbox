/**
 * Base44 Setup and Configuration Script
 * 
 * Helps set up and test the Base44 API integration.
 * 
 * Usage:
 *   npm run base44:setup
 */

import { initBase44Client } from '../src/lib/base44Client';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve);
  });
}

async function setupBase44() {
  console.log('🔧 Base44 API Setup\n');
  console.log('This script will help you configure the Base44 API integration.\n');

  // Check current environment
  const currentApiUrl = process.env.BASE44_API_URL || 'https://app.base44.com';
  const currentAppId = process.env.BASE44_APP_ID;
  const currentApiKey = process.env.BASE44_API_KEY;

  console.log('Current Configuration:');
  console.log(`  BASE44_API_URL: ${currentApiUrl}`);
  console.log(`  BASE44_APP_ID: ${currentAppId || 'NOT SET'}`);
  console.log(`  BASE44_API_KEY: ${currentApiKey ? '***' + currentApiKey.slice(-4) : 'NOT SET'}\n`);

  if (currentAppId && currentApiKey) {
    console.log('✅ Configuration is already set.\n');
    
    const test = await question('Would you like to test the connection? (y/n): ');
    if (test.toLowerCase() === 'y') {
      rl.close();
      console.log('\n🧪 Running API tests...\n');
      const { execSync } = require('child_process');
      try {
        execSync('npm run base44:test', { stdio: 'inherit', env: process.env });
      } catch (error) {
        console.error('\n❌ Tests failed. Please check your configuration.');
      }
      return;
    }
  } else {
    console.log('⚠️  Configuration is incomplete.\n');
    console.log('Required:\n');
    console.log('1. BASE44_APP_ID - Your Base44 App ID (e.g., 6962980527a433f05c114277)');
    console.log('2. BASE44_API_KEY - Your Base44 API key\n');
    console.log('To set them up:\n');
    console.log('   Windows PowerShell:');
    console.log('   $env:BASE44_APP_ID="your_app_id"');
    console.log('   $env:BASE44_API_KEY="your_key_here"\n');
    console.log('   Windows CMD:');
    console.log('   set BASE44_APP_ID=your_app_id');
    console.log('   set BASE44_API_KEY=your_key_here\n');
    console.log('   Linux/Mac:');
    console.log('   export BASE44_APP_ID=your_app_id');
    console.log('   export BASE44_API_KEY=your_key_here\n');
    console.log('   Or add to your .env file:');
    console.log('   BASE44_APP_ID=your_app_id');
    console.log('   BASE44_API_KEY=your_key_here\n');

    const setNow = await question('Do you have your credentials and want to set them now? (y/n): ');
    if (setNow.toLowerCase() === 'y') {
      if (!currentAppId) {
        const appId = await question('Enter your Base44 App ID: ');
        if (appId.trim()) {
          process.env.BASE44_APP_ID = appId.trim();
          console.log('✅ App ID set for this session.\n');
        }
      }
      
      if (!currentApiKey) {
        const apiKey = await question('Enter your Base44 API key: ');
        if (apiKey.trim()) {
          process.env.BASE44_API_KEY = apiKey.trim();
          console.log('✅ API key set for this session.\n');
        }
      }
      
      console.log('⚠️  Note: This only sets them for the current terminal session.');
      console.log('   To make it permanent, add them to your .env file or system environment.\n');

      if (process.env.BASE44_APP_ID && process.env.BASE44_API_KEY) {
        const test = await question('Would you like to test the connection now? (y/n): ');
        if (test.toLowerCase() === 'y') {
          rl.close();
          console.log('\n🧪 Running API tests...\n');
          const { execSync } = require('child_process');
          try {
            execSync('npm run base44:test', { stdio: 'inherit', env: process.env });
          } catch (error) {
            console.error('\n❌ Tests failed. Please verify your credentials are correct.');
          }
          return;
        }
      }
    }
  }

  rl.close();
  console.log('\n📝 Next Steps:');
  console.log('1. Set BASE44_APP_ID and BASE44_API_KEY environment variables');
  console.log('2. Run: npm run base44:test');
  console.log('3. Run: npm run base44:sync:dry-run');
  console.log('4. Once verified, run: npm run base44:sync\n');
}

setupBase44().catch((error) => {
  console.error('Setup error:', error);
  rl.close();
  process.exit(1);
});

