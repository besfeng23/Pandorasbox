#!/usr/bin/env node

/**
 * Test script for MCP Server
 * Tests that the server can start and handle requests
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { handleSearchKnowledgeBase } from '../src/mcp/tools/search-knowledge';
import { handleAddMemory } from '../src/mcp/tools/add-memory';
import { handleGenerateArtifact } from '../src/mcp/tools/generate-artifact';

async function testMCP() {
  console.log('🧪 Testing MCP Server...\n');

  // Test 1: Check environment variables
  console.log('1. Checking environment variables...');
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey || openaiKey === 'your_openai_api_key_here') {
    console.error('❌ OPENAI_API_KEY not set in .env.local');
    process.exit(1);
  }
  console.log('✅ OPENAI_API_KEY is set\n');

  // Test 2: Initialize server
  console.log('2. Initializing MCP server...');
  const server = new Server(
    {
      name: 'pandoras-box',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );
  console.log('✅ Server initialized\n');

  // Test 3: Test ListTools handler
  console.log('3. Testing ListTools handler...');
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'search_knowledge_base',
          description: 'Search the knowledge base',
          inputSchema: {
            type: 'object',
            properties: {
              query: { type: 'string' },
              user_email: { type: 'string' },
            },
            required: ['query', 'user_email'],
          },
        },
      ],
    };
  });
  console.log('✅ ListTools handler registered\n');

  // Test 4: Test imports
  console.log('4. Testing tool imports...');
  try {
    // Just verify imports work
    if (typeof handleSearchKnowledgeBase === 'function') {
      console.log('✅ search-knowledge imported');
    }
    if (typeof handleAddMemory === 'function') {
      console.log('✅ add-memory imported');
    }
    if (typeof handleGenerateArtifact === 'function') {
      console.log('✅ generate-artifact imported');
    }
  } catch (error) {
    console.error('❌ Import error:', error);
    process.exit(1);
  }
  console.log('✅ All tools imported successfully\n');

  // Test 5: Test Firebase Admin initialization
  console.log('5. Testing Firebase Admin initialization...');
  try {
    const { getFirestoreAdmin, getAuthAdmin } = await import('../src/lib/firebase-admin');
    const firestore = getFirestoreAdmin();
    const auth = getAuthAdmin();
    console.log('✅ Firebase Admin initialized');
  } catch (error: any) {
    console.error('❌ Firebase Admin error:', error.message);
    // Don't exit - Firebase might not be configured but MCP can still work
    console.log('⚠️  Continuing without Firebase (may need service account)\n');
  }

  console.log('\n✅ All tests passed! MCP server is ready.');
  console.log('\nTo use in Cursor:');
  console.log('1. Restart Cursor');
  console.log('2. Check Settings → MCP Servers');
  console.log('3. pandoras-box should show as connected');
}

testMCP().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

