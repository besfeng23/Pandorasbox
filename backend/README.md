# Pandora's Box

An AI-powered chat application with persistent long-term memory and MCP (Model Context Protocol) server capabilities.

## Features

- **AI Chat Interface**: ChatGPT-like interface with persistent memory
- **Vector Search**: Semantic search across conversation history and memories
- **Memory Management**: Store and retrieve long-term memories with embeddings
- **Artifact Creation**: Generate and save code/markdown artifacts
- **Sovereign Architecture**: Completely self-hosted with no external dependencies

## Environment Variables

### Required

- None (Local vLLM)
- `INFERENCE_URL`: URL to your vLLM instance (e.g., `http://localhost:8000/v1`)
- `QDRANT_URL`: URL to your Qdrant instance (e.g., `http://localhost:6333`)
- `EMBEDDINGS_BASE_URL`: URL to your local embeddings service
- Firebase service account credentials (via `service-account.json` or Application Default Credentials)

### Local Infrastructure

When running locally with the bundled inference, embeddings, and Qdrant services:

```bash
INFERENCE_URL=http://localhost:8000/v1
INFERENCE_MODEL=mistralai/Mistral-7B-Instruct-v0.3
EMBEDDINGS_BASE_URL=http://localhost:8080
QDRANT_URL=http://localhost:6333
```

## Development

```bash
# Install dependencies
npm install

# Start local infrastructure (or: docker-compose up -d)
npm run infra:up

# Verify services
curl http://localhost:6333/collections  # Qdrant
curl http://localhost:8080/health        # Embeddings

# Run Next.js development server
npm run dev

# Type checking
npm run typecheck
```
