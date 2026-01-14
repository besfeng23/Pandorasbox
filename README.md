# Pandora's Box

An AI-powered chat application with persistent long-term memory and MCP (Model Context Protocol) server capabilities.

## Features

- **AI Chat Interface**: ChatGPT-like interface with persistent memory
- **Vector Search**: Semantic search across conversation history and memories
- **Memory Management**: Store and retrieve long-term memories with embeddings
- **Artifact Creation**: Generate and save code/markdown artifacts
- **MCP Server**: Expose capabilities to external AI agents (ChatGPT Actions, Claude Desktop)
- **PandoraUI**: Unified, phase-aware UI with real-time system metrics

## PandoraUI Setup & Activation

### 1. Seed System Data
Populate the Firestore database with system phases and telemetry data to activate the UI.

```bash
# Seed 14 system phases
npm run seed:phases

# Seed initial telemetry metrics
npx tsx scripts/seed-telemetry.ts
```

### 2. Deploy Configuration
Deploy Firestore security rules and indexes.

```bash
firebase deploy --only firestore
```

### 3. Verify UI
Run the development server and check the dashboard.

```bash
npm run dev
# Visit http://localhost:9002
```

**Checklist:**
- ✅ PhaseIndicator updates on click
- ✅ PhaseDashboard shows grid and live values
- ✅ Pandora Cube animates and opens menu
- ✅ Settings modal works
- ✅ Sidebar search works

## MCP Server

Pandora's Box includes a fully functional MCP server that exposes three tools:

1. **search_knowledge_base**: Semantic search across memories and history
2. **add_memory**: Store new memories with embeddings
3. **generate_artifact**: Create and save code/markdown artifacts

### Running the MCP Server

```bash
# Development mode
npm run mcp:dev

# Production mode
npm run mcp:start

# Generate OpenAPI schema for ChatGPT Actions
npm run mcp:generate-schema
```

### Using with Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "pandoras-box": {
      "command": "node",
      "args": ["path/to/Pandorasbox/src/mcp/index.ts"]
    }
  }
}
```

### Using with ChatGPT Actions

1. Generate the OpenAPI schema:
   ```bash
   npm run mcp:generate-schema
   ```

2. The schema will be generated at `public/openapi-mcp.json`

3. Host the schema file at a publicly accessible URL

4. Add it as a Custom Action in ChatGPT:
   - Go to ChatGPT Settings → Actions
   - Add Custom Action
   - Provide the URL to your OpenAPI schema
   - Set Authorization header: `Bearer YOUR_MCP_API_KEY`

## Environment Variables

### Required

- `OPENAI_API_KEY`: OpenAI API key for embeddings and chat completions
- Firebase service account credentials (via `service-account.json` or Application Default Credentials)

### MCP Server

- `MCP_API_KEY`: API key for MCP server authentication (defaults to `CHATGPT_API_KEY` if not set)
- `MCP_SERVER_URL`: Base URL for OpenAPI schema (default: `http://localhost:9002`)

### Optional

- `CHATGPT_API_KEY`: API key for ChatGPT Actions integration (can be used as fallback for `MCP_API_KEY`)

## Environment Flexibility (Secrets URL)

Pandora’s Box supports loading runtime configuration from a **Cloud Run Secrets URL JSON** (preferred) with a safe fallback to `process.env`.

- **Required env**:
  - `APP_ENV`: `dev` | `staging` | `prod`
  - `CLOUDRUN_SECRETS_BASE_URL`: base URL for secrets JSON
  - `CLOUDRUN_SECRETS_BEARER` (optional): bearer token for the secrets URL (server-side only)

- **Fetch target**:
  - `${CLOUDRUN_SECRETS_BASE_URL}/pandorasbox/${APP_ENV}.json`

- **Verify (keys only)**:
  - `npm run secrets:check`

## Development

```bash
# Install dependencies
npm install

# Run Next.js development server
npm run dev

# Run MCP server (in separate terminal)
npm run mcp:dev

# Type checking
npm run typecheck
```

## Getting Started

To get started, take a look at `src/app/page.tsx`.
