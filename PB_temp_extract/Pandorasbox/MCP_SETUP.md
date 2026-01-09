# MCP Server Setup Guide

This guide will help you set up the Pandora's Box MCP (Model Context Protocol) server for use with Claude Desktop or ChatGPT Actions.

## Prerequisites

- Node.js and npm installed
- Firebase project configured
- OpenAI API key
- (Optional) ChatGPT API key for Actions

## Step 1: Install Dependencies

```bash
npm install
```

## Step 2: Set Environment Variables

Create a `.env.local` file in the project root with the following variables:

```env
# OpenAI API Key (required for embeddings)
OPENAI_API_KEY=your_openai_api_key_here

# MCP API Key (for HTTP bridge authentication)
# Use the same key as CHATGPT_API_KEY or create a new one
MCP_API_KEY=OKepTRWlwBohzaEbCGQgcUZXjI34m7qL

# Alternative: ChatGPT API Key (if MCP_API_KEY is not set, this will be used)
CHATGPT_API_KEY=OKepTRWlwBohzaEbCGQgcUZXjI34m7qL

# MCP Server URL (for OpenAPI schema generation)
# For local development:
MCP_SERVER_URL=http://localhost:9002
# For production:
# MCP_SERVER_URL=https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app
```

**Note:** The API key `OKepTRWlwBohzaEbCGQgcUZXjI34m7qL` is already configured for ChatGPT integration. You can use the same key for MCP.

## Step 3: Generate OpenAPI Schema

Generate the OpenAPI schema for ChatGPT Actions:

```bash
npm run mcp:generate-schema
```

This will create/update `public/openapi-mcp.json` with the API schema.

## Step 4: Run MCP Server

### For Development (stdio - Claude Desktop)

```bash
npm run mcp:dev
```

This runs the MCP server via stdio, which is used by Claude Desktop.

### For Production (HTTP - ChatGPT Actions)

The MCP HTTP bridge is already available at:
- `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/mcp/{tool_name}`

No separate server process is needed - it's part of the Next.js application.

## Step 5: Configure Claude Desktop

1. Open Claude Desktop settings
2. Add the MCP server configuration:

```json
{
  "mcpServers": {
    "pandoras-box": {
      "command": "npm",
      "args": ["run", "mcp:dev"],
      "cwd": "/path/to/Pandorasbox"
    }
  }
}
```

**Windows PowerShell:**
```json
{
  "mcpServers": {
    "pandoras-box": {
      "command": "npm.cmd",
      "args": ["run", "mcp:dev"],
      "cwd": "C:\\Users\\Administrator\\Downloads\\New folder\\Pandorasbox"
    }
  }
}
```

## Step 6: Configure ChatGPT Actions

1. Go to ChatGPT → Create GPT → Actions
2. Import the OpenAPI schema:
   - **URL**: `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/public/openapi-mcp.yaml`
   - Or upload the local file: `public/openapi-mcp.yaml`
   - **Note**: ChatGPT Actions prefers YAML format over JSON
3. Set Authentication:
   - **Type**: API Key
   - **Auth Type**: Bearer
   - **API Key**: `OKepTRWlwBohzaEbCGQgcUZXjI34m7qL`
   - **Header Name**: `Authorization`

## Available MCP Tools

### 1. `search_knowledge_base`
Search the knowledge base using semantic search.

**Parameters:**
- `query` (required): Search query
- `user_email` (required): User email address
- `limit` (optional): Max results (1-50, default: 10)

**Example:**
```json
{
  "query": "user preferences for dark mode",
  "user_email": "joven.ong23@gmail.com",
  "limit": 5
}
```

### 2. `add_memory`
Add a new memory to the knowledge base.

**Parameters:**
- `memory` (required): Memory content to store
- `user_email` (required): User email address

**Example:**
```json
{
  "memory": "User prefers dark mode interfaces",
  "user_email": "joven.ong23@gmail.com"
}
```

### 3. `generate_artifact`
Create and save a code or markdown artifact.

**Parameters:**
- `title` (required): Artifact title
- `type` (required): "code" or "markdown"
- `content` (required): Artifact content
- `user_email` (required): User email address

**Example:**
```json
{
  "title": "Example React Component",
  "type": "code",
  "content": "function Example() { return <div>Hello</div>; }",
  "user_email": "joven.ong23@gmail.com"
}
```

## Testing the MCP Server

### Test via HTTP (ChatGPT Actions)

```bash
curl -X POST https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app/api/mcp/search_knowledge_base \
  -H "Authorization: Bearer OKepTRWlwBohzaEbCGQgcUZXjI34m7qL" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "user preferences",
    "user_email": "joven.ong23@gmail.com",
    "limit": 5
  }'
```

### Test via MCP (Claude Desktop)

The MCP server will automatically connect when Claude Desktop starts. You can test it by asking Claude to use the tools:

- "Search my knowledge base for information about dark mode preferences"
- "Add a memory that I prefer TypeScript over JavaScript"
- "Generate a code artifact for a React component"

## Troubleshooting

### MCP Server Not Starting

1. Check that all dependencies are installed: `npm install`
2. Verify environment variables are set in `.env.local`
3. Check that `tsx` is installed: `npm list tsx`

### API Key Authentication Fails

1. Verify `MCP_API_KEY` or `CHATGPT_API_KEY` is set in `.env.local`
2. Check that the API key matches in ChatGPT Actions configuration
3. Ensure the Authorization header format is: `Bearer {API_KEY}`

### OpenAPI Schema Not Generating

2. Verify the `public` directory exists
3. Check file permissions

### Claude Desktop Not Connecting

1. Verify the path in Claude Desktop settings is correct
2. Check that `npm run mcp:dev` works when run manually
3. Ensure Node.js is in your PATH

## Next Steps

- ✅ Dependencies installed
- ✅ Environment variables configured
- ✅ OpenAPI schema generated
- ✅ MCP server ready

The MCP server is now ready to use with Claude Desktop or ChatGPT Actions!

