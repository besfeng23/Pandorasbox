/**
 * ═══════════════════════════════════════════════════════════════════════════
 * MCP API ROUTE
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Exposes custom tools to the Next.js MCP endpoint.
 */

import { NextRequest } from 'next/server';
import {
    search_universe_memory,
    searchUniverseMemorySchema,
    add_universe_memory,
    addUniverseMemorySchema
} from '@/lib/mcp/tools/memory-tools';
import { generate_artifact, generateArtifactSchema } from '@/lib/mcp/tools/artifact-tools';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { method, params } = body;

        // List available tools
        if (method === 'list_tools') {
            return Response.json({
                tools: [
                    {
                        name: 'search_universe_memory',
                        description: 'Search the local Universe memory for semantic facts and chat history.',
                        parameters: {
                            type: 'object',
                            properties: {
                                query: { type: 'string', description: 'The search query' },
                                userId: { type: 'string', description: 'The user ID' },
                                limit: { type: 'number', description: 'Max results' }
                            },
                            required: ['query', 'userId']
                        }
                    },
                    {
                        name: 'add_universe_memory',
                        description: 'Explicitly save a factual memory about the user to long-term storage (instant crystallization).',
                        parameters: {
                            type: 'object',
                            properties: {
                                content: { type: 'string', description: 'The fact to remember' },
                                userId: { type: 'string', description: 'The user ID' },
                                agentId: { type: 'string', enum: ['universe', 'builder'], description: 'The agent brain' }
                            },
                            required: ['content', 'userId']
                        }
                    },
                    {
                        name: 'generate_artifact',
                        description: 'High-velocity code/artifact generation using the Groq Builder agent.',
                        parameters: {
                            type: 'object',
                            properties: {
                                description: { type: 'string', description: 'What to build' },
                                language: { type: 'string', enum: ['typescript', 'javascript', 'tsx', 'markdown', 'css'] },
                                context: { type: 'string', description: 'Additional context' }
                            },
                            required: ['description', 'language']
                        }
                    }
                ]
            });
        }

        // Call specific tool
        if (method === 'call_tool') {
            const { name, arguments: args } = params;

            if (name === 'search_universe_memory') {
                const validatedArgs = searchUniverseMemorySchema.parse(args);
                const result = await search_universe_memory(validatedArgs);
                return Response.json(result);
            }

            if (name === 'add_universe_memory') {
                const validatedArgs = addUniverseMemorySchema.parse(args);
                const result = await add_universe_memory(validatedArgs);
                return Response.json(result);
            }

            if (name === 'generate_artifact') {
                const validatedArgs = generateArtifactSchema.parse(args);
                const result = await generate_artifact(validatedArgs);
                return Response.json(result);
            }

            return Response.json({ error: `Tool ${name} not found` }, { status: 404 });
        }

        return Response.json({ error: 'Method not supported' }, { status: 400 });

    } catch (error: any) {
        console.error('[MCP Route] Error:', error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}
