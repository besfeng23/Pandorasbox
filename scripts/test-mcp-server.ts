#!/usr/bin/env tsx
/**
 * Test script for Pandora MCP Server
 * 
 * This script verifies that:
 * 1. The MCP server file can be imported
 * 2. Environment variables are accessible
 * 3. Firebase Admin can initialize
 * 4. Tool handlers are available
 */

import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

async function testMCPSetup() {
  console.log('🧪 Testing Pandora MCP Server Setup...\n');

  // Test 1: Environment variables
  console.log('1️⃣ Checking environment variables...');
  const firebaseKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim();
  
  if (firebaseKey) {
    console.log(`   ✅ FIREBASE_SERVICE_ACCOUNT_KEY is set: ${firebaseKey}`);
  } else {
    console.log('   ⚠️  FIREBASE_SERVICE_ACCOUNT_KEY is not set (will use fallback)');
  }

  // Test 2: Firebase Admin initialization
  console.log('\n2️⃣ Testing Firebase Admin initialization...');
  try {
    const { getFirestoreAdmin, getAuthAdmin } = await import('@/lib/firebase-admin');
    const firestore = getFirestoreAdmin();
    const auth = getAuthAdmin();
    console.log('   ✅ Firebase Admin initialized successfully');
    console.log('   ✅ Firestore instance available');
    console.log('   ✅ Auth instance available');
  } catch (error: any) {
    console.log(`   ⚠️  Firebase Admin initialization failed: ${error.message}`);
    console.log('   (This is okay if service account is not configured)');
  }

  // Test 3: Tool handlers
  console.log('\n3️⃣ Testing tool handler imports...');
  try {
    const { handleAddMemory } = await import('@/mcp/tools/add-memory');
    const { handleSearchKnowledgeBase } = await import('@/mcp/tools/search-knowledge');
    
    if (typeof handleAddMemory === 'function') {
      console.log('   ✅ handleAddMemory is available');
    } else {
      console.log('   ❌ handleAddMemory is not a function');
    }
    
    if (typeof handleSearchKnowledgeBase === 'function') {
      console.log('   ✅ handleSearchKnowledgeBase is available');
    } else {
      console.log('   ❌ handleSearchKnowledgeBase is not a function');
    }
  } catch (error: any) {
    console.log(`   ❌ Failed to import tool handlers: ${error.message}`);
    if (error.stack) {
      console.log(`   Stack: ${error.stack.split('\n').slice(0, 3).join('\n')}`);
    }
  }

  // Test 4: MCP Server file structure
  console.log('\n4️⃣ Verifying MCP server file...');
  try {
    const fs = require('fs');
    const path = require('path');
    const serverPath = path.join(process.cwd(), 'src/server/mcp-server.ts');
    
    if (fs.existsSync(serverPath)) {
      console.log('   ✅ MCP server file exists');
      const content = fs.readFileSync(serverPath, 'utf-8');
      
      if (content.includes('handleAddMemory')) {
        console.log('   ✅ add_memory tool handler referenced');
      }
      
      if (content.includes('handleSearchKnowledgeBase')) {
        console.log('   ✅ query_knowledge tool handler referenced');
      }
      
      if (content.includes('StdioServerTransport')) {
        console.log('   ✅ MCP SDK properly imported');
      }
    } else {
      console.log('   ❌ MCP server file not found');
    }
  } catch (error: any) {
    console.log(`   ⚠️  Could not verify file: ${error.message}`);
  }

  console.log('\n✅ Test complete!\n');
  console.log('📝 Next steps:');
  console.log('   1. Restart Cursor to activate the MCP server');
  console.log('   2. The server will be available as "pandora" in Cursor');
  console.log('   3. Tools: add_memory, query_knowledge\n');
}

testMCPSetup().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
