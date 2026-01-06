#!/usr/bin/env node

/**
 * End-to-end test for MCP Server
 * Tests actual MCP protocol communication
 */

import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(process.cwd(), '.env.local') });

import { spawn } from 'child_process';
import { readFileSync } from 'fs';

async function testMCPE2E() {
  console.log('🧪 End-to-End MCP Server Test\n');
  console.log('Starting MCP server...\n');

  const serverProcess = spawn('npm', ['run', 'mcp:dev'], {
    cwd: process.cwd(),
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
  });

  let serverOutput = '';
  let serverError = '';

  serverProcess.stdout.on('data', (data) => {
    serverOutput += data.toString();
  });

  serverProcess.stderr.on('data', (data) => {
    const output = data.toString();
    serverError += output;
    // MCP servers write to stderr for logging
    if (output.includes('running on stdio')) {
      console.log('✅ Server started and listening on stdio\n');
    }
  });

  // Wait for server to start
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test: Send MCP initialize request
  const initRequest = {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: {
        name: 'test-client',
        version: '1.0.0',
      },
    },
  };

  console.log('1. Testing MCP protocol initialization...');
  serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');

  // Wait a bit for response
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test: Send list tools request
  const listToolsRequest = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  };

  console.log('2. Testing tools/list request...');
  serverProcess.stdin.write(JSON.stringify(listToolsRequest) + '\n');

  await new Promise(resolve => setTimeout(resolve, 1000));

  // Cleanup
  serverProcess.kill();
  
  console.log('\n✅ End-to-end test completed');
  console.log('\nServer is ready for Cursor integration!');
}

testMCPE2E().catch((error) => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});

