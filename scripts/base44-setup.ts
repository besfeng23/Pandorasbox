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
  const currentApiUrl = process.env.BASE44_API_URL || 'https://kairostrack.base44.app';
  const currentApiKey = process.env.BASE44_API_KEY;

  console.log('Current Configuration:');
  console.log(`  BASE44_API_URL: ${currentApiUrl}`);
  console.log(`  BASE44_API_KEY: ${currentApiKey ? '***' + currentApiKey.slice(-4) : 'NOT SET'}\n`);

  if (currentApiKey) {
    console.log('✅ API key is already set in environment.\n');
    
    const test = await question('Would you like to test the connection? (y/n): ');
    if (test.toLowerCase() === 'y') {
      rl.close();
      console.log('\n🧪 Running API tests...\n');
      const { execSync } = require('child_process');
      try {
        execSync('npm run base44:test', { stdio: 'inherit', env: process.env });
      } catch (error) {
        console.error('\n❌ Tests failed. Please check your API key.');
      }
      return;
    }
  } else {
    console.log('⚠️  API key is not set.\n');
    console.log('To set it up:\n');
    console.log('1. Get your API key from Base44 dashboard');
    console.log('2. Set it as an environment variable:\n');
    console.log('   Windows PowerShell:');
    console.log('   $env:BASE44_API_KEY="your_key_here"\n');
    console.log('   Windows CMD:');
    console.log('   set BASE44_API_KEY=your_key_here\n');
    console.log('   Linux/Mac:');
    console.log('   export BASE44_API_KEY=your_key_here\n');
    console.log('3. Or add it to your .env file:');
    console.log('   BASE44_API_KEY=your_key_here\n');

    const setNow = await question('Do you have your API key and want to set it now? (y/n): ');
    if (setNow.toLowerCase() === 'y') {
      const apiKey = await question('Enter your Base44 API key: ');
      if (apiKey.trim()) {
        process.env.BASE44_API_KEY = apiKey.trim();
        console.log('\n✅ API key set for this session.\n');
        console.log('⚠️  Note: This only sets it for the current terminal session.');
        console.log('   To make it permanent, add it to your .env file or system environment.\n');

        const test = await question('Would you like to test the connection now? (y/n): ');
        if (test.toLowerCase() === 'y') {
          rl.close();
          console.log('\n🧪 Running API tests...\n');
          const { execSync } = require('child_process');
          try {
            execSync('npm run base44:test', { stdio: 'inherit', env: process.env });
          } catch (error) {
            console.error('\n❌ Tests failed. Please verify your API key is correct.');
          }
          return;
        }
      }
    }
  }

  rl.close();
  console.log('\n📝 Next Steps:');
  console.log('1. Set BASE44_API_KEY environment variable');
  console.log('2. Run: npm run base44:test');
  console.log('3. Run: npm run base44:sync:dry-run');
  console.log('4. Once verified, run: npm run base44:sync\n');
}

setupBase44().catch((error) => {
  console.error('Setup error:', error);
  rl.close();
  process.exit(1);
});

