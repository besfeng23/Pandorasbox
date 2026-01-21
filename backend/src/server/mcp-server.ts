#!/usr/bin/env node

/**
 * Pandora's Box MCP Server (Cursor-local)
 *
 * This is a minimal MCP server entrypoint intended for use with Cursor's
 * `.cursor/mcp.json` configuration. It exposes:
 *
 * - add_memory: write a new memory to Firestore with embeddings
 * - query_knowledge: semantic search across history + memories
 *
 * It reuses the existing MCP tool handlers from `src/mcp/tools`.
 */

// Load environment variables from .env.local (for OPENAI_API_KEY, etc.)
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  InitializeRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';

import { handleAddMemory } from '@/mcp/tools/add-memory';
import { handleSearchKnowledgeBase } from '@/mcp/tools/search-knowledge';

// Validate required environment variables (best-effort)
function validateEnvironment() {
  const missing: string[] = [];

  if (!process.env.OPENAI_API_KEY?.trim()) {
    missing.push('OPENAI_API_KEY');
  }

  if (!process.env.FIREBASE_SERVICE_ACCOUNT_KEY?.trim()) {
    console.warn(
      '⚠️  FIREBASE_SERVICE_ACCOUNT_KEY is not set. ' +
        'The MCP server will fall back to Application Default Credentials or service-account.json.'
    );
  }

  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please set these in .env.local or your MCP server environment.');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

let envValidated = false;
try {
  validateEnvironment();
  envValidated = true;
  console.error('✅ Environment variables validated');
} catch (error: any) {
  console.error('⚠️  Environment validation failed:', error.message);
  console.error('⚠️  Server will start but tools may fail until environment is configured');
}

// Initialize the server
const server = new Server(
  {
    name: 'pandora-local',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handle initialize
server.setRequestHandler(InitializeRequestSchema, async () => {
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: 'pandora-local',
      version: '1.0.0',
    },
  };
});

// List tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'add_memory',
        description:
          'Add a new memory to the Pandora knowledge base. The memory will be embedded and stored in Firestore.',
        inputSchema: {
          type: 'object',
          properties: {
            memory: {
              type: 'string',
              description: 'The memory content to store',
            },
            user_email: {
              type: 'string',
              description: 'Email address of the user to associate this memory with',
            },
          },
          required: ['memory', 'user_email'],
        },
      },
      {
        name: 'query_knowledge',
        description:
          'Query the Pandora knowledge base (history + memories) using semantic search. Returns ranked results.',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'The search query to find relevant information',
            },
            user_email: {
              type: 'string',
              description: 'Email address of the user whose knowledge base to search',
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results to return (1-50, default: 10)',
              minimum: 1,
              maximum: 50,
            },
          },
          required: ['query', 'user_email'],
        },
      },
    ],
  };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    console.error(`🔧 Executing tool: ${name}`);

    switch (name) {
      case 'add_memory': {
        const result = await handleAddMemory(args as any);
        console.error(`✅ add_memory completed: memory_id=${result.memory_id}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      case 'query_knowledge': {
        const results = await handleSearchKnowledgeBase(args as any);
        console.error(`✅ query_knowledge completed: ${results.length} results`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      }

      default:
        console.error(`❌ Unknown tool: ${name}`);
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }
  } catch (error: any) {
    if (error instanceof McpError) {
      console.error(`❌ MCP Error in ${name}:`, error.message);
      throw error;
    }

    console.error(`❌ Unexpected error executing tool ${name}:`, error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to execute tool: ${error.message || 'Unknown error'}`
    );
  }
});

// Start the server
async function main() {
  try {
    if (!envValidated) {
      console.error('⚠️  Starting server with unvalidated environment. Tools may fail.');
    }

    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('✅ Pandora local MCP server running on stdio');
    console.error('📋 Available tools: add_memory, query_knowledge');

    // Optional: warm up Firebase Admin
    try {
      const { getFirestoreAdmin } = await import('@/lib/firebase-admin');
      getFirestoreAdmin();
      console.error('✅ Firebase Admin initialized');
    } catch (firebaseError: any) {
      console.warn('⚠️  Firebase initialization check failed:', firebaseError.message);
    }
  } catch (error: any) {
    console.error('❌ Fatal error starting Pandora MCP server:', error.message || error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main();


