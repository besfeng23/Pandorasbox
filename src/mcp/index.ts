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

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { handleSearchKnowledgeBase } from './tools/search-knowledge';
import { handleAddMemory } from './tools/add-memory';
import { handleGenerateArtifact } from './tools/generate-artifact';

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
    switch (name) {
      case 'search_knowledge_base': {
        const result = await handleSearchKnowledgeBase(args as any);
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
        throw new McpError(
          ErrorCode.MethodNotFound,
          `Unknown tool: ${name}`
        );
    }
  } catch (error: any) {
    // Handle known errors
    if (error instanceof McpError) {
      throw error;
    }

    // Handle validation errors
    if (error.message && typeof error.message === 'string') {
      throw new McpError(
        ErrorCode.InvalidParams,
        error.message
      );
    }

    // Handle unknown errors
    console.error(`Error executing tool ${name}:`, error);
    throw new McpError(
      ErrorCode.InternalError,
      `Failed to execute tool: ${error.message || 'Unknown error'}`
    );
  }
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Pandora\'s Box MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error in MCP server:', error);
  process.exit(1);
});

