/**
 * Standalone MCP Schema Generator
 * This file is isolated from the main Next.js runtime to avoid 'server-only' import errors.
 */

const tools = [
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
];

console.log(JSON.stringify(tools, null, 2));
process.exit(0);
