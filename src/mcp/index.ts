#!/usr/bin/env node

/**
 * MCP Server for Pandora's Box
 * 
 * This server exposes Pandora's Box capabilities as MCP tools:
 * - search_knowledge_base: Semantic search across memories and history
 * - add_memory: Store new memories with embeddings
 * - generate_artifact: Create and save code/markdown artifacts
 * 
 * Usage:
 *   npm run mcp:dev    # Development mode
 *   npm run mcp:start  # Production mode
 */

// Load environment variables from .env.local
import { config } from 'dotenv';
import { resolve, join } from 'path';
import { existsSync } from 'fs';
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
import { handleSearchKnowledgeBase } from './tools/search-knowledge';
import { handleAddMemory } from './tools/add-memory';
import { handleGenerateArtifact } from './tools/generate-artifact';

// Validate required environment variables
function validateEnvironment() {
  const requiredVars = ['OPENAI_API_KEY'];
  const missing: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]?.trim()) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please set these in .env.local file');
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
  
  // Check for Firebase service account (optional, will use ADC if not present)
  const serviceAccountPath = join(process.cwd(), 'service-account.json');
  if (!existsSync(serviceAccountPath)) {
    console.warn('⚠️  service-account.json not found. Will use Application Default Credentials if available.');
  } else {
    console.error('✅ Found service-account.json');
  }
}

// Initialize and validate on startup (non-blocking)
let envValidated = false;
try {
  validateEnvironment();
  envValidated = true;
  console.error('✅ Environment variables validated');
} catch (error: any) {
  console.error('❌ Environment validation failed:', error.message);
  console.error('⚠️  Server will start but tools may fail until environment is configured');
  // Don't exit immediately - let the server start and fail gracefully on first request
}

// Initialize the server
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

// Handle initialize request
server.setRequestHandler(InitializeRequestSchema, async (request) => {
  return {
    protocolVersion: '2024-11-05',
    capabilities: {
      tools: {},
    },
    serverInfo: {
      name: 'pandoras-box',
      version: '1.0.0',
    },
  };
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'search_knowledge_base',
        description: 'Search the knowledge base using semantic search. Searches both conversation history and stored memories to find relevant information.',
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
      {
        name: 'add_memory',
        description: 'Add a new memory to the knowledge base. The memory will be stored with an embedding for future semantic search.',
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
        name: 'generate_artifact',
        description: 'Create and save a code or markdown artifact. Artifacts can be code snippets, documentation, or other structured content.',
        inputSchema: {
          type: 'object',
          properties: {
            title: {
              type: 'string',
              description: 'Title of the artifact',
            },
            type: {
              type: 'string',
              enum: ['code', 'markdown'],
              description: 'Type of artifact: "code" for code snippets, "markdown" for documentation',
            },
            content: {
              type: 'string',
              description: 'The content of the artifact',
            },
            user_email: {
              type: 'string',
              description: 'Email address of the user to associate this artifact with',
            },
          },
          required: ['title', 'type', 'content', 'user_email'],
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
      case 'search_knowledge_base': {
        const result = await handleSearchKnowledgeBase(args as any);
        console.error(`✅ search_knowledge_base completed: ${result.length} results`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

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

      case 'generate_artifact': {
        const result = await handleGenerateArtifact(args as any);
        console.error(`✅ generate_artifact completed: artifact_id=${result.artifact_id}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      }

      default:
        console.error(`❌ Unknown tool: ${name}`);
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error: any) {
    // Handle known errors
    if (error instanceof McpError) {
      console.error(`❌ MCP Error in ${name}:`, error.message);
      throw error;
    }

    // Handle validation errors
    if (error.message && typeof error.message === 'string') {
      console.error(`❌ Validation error in ${name}:`, error.message);
      throw new McpError(
        ErrorCode.InvalidParams,
        error.message
      );
    }

    // Handle unknown errors
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
    // Warn if environment wasn't validated
    if (!envValidated) {
      console.error('⚠️  Starting server with unvalidated environment. Tools may fail.');
    }
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error('✅ Pandora\'s Box MCP server running on stdio');
    console.error('📋 Available tools: search_knowledge_base, add_memory, generate_artifact');
    
    // Test Firebase initialization (non-blocking)
    try {
      const { getFirestoreAdmin } = await import('@/lib/firebase-admin');
      getFirestoreAdmin(); // This will initialize Firebase
      console.error('✅ Firebase Admin initialized');
    } catch (firebaseError: any) {
      console.warn('⚠️  Firebase initialization check failed:', firebaseError.message);
      console.warn('⚠️  Tools requiring Firebase may fail until credentials are configured');
    }
  } catch (error: any) {
    console.error('❌ Fatal error starting MCP server:', error.message || error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

main();

