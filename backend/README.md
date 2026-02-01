# Pandora's Box

An AI-powered sovereign chat application with persistent long-term memory, subnetwork routing, and full observability.

## Features

- **AI Chat Interface**: ChatGPT-like interface with persistent memory and thread management.
- **Sovereign Architecture**: Completely self-hosted with no external dependencies (runs on vLLM + Qdrant).
- **Subnetwork Routing (Phase 14)**: Automatically routes queries to specialized agents:
  - **The Builder**: Writes code, fixes bugs (React/Next.js expert).
  - **The Universe**: Philosophical and creative exploration.
  - **The Analyst**: Data analysis and reasoning.
- **Long-Term Memory (Phase 13)**: Vector-based semantic search across all conversation history using Qdrant.
  - **Requirement**: `memories` collection MUST use **384 dimensions** (matches `all-MiniLM-L6-v2`).
- **MCP Integration**: Model Context Protocol support for tool discovery and execution.
  - **Schema Generation**: `pnpm run mcp:generate-schema` creates Claude-compatible tool definitions.
- **Real-Time Observability**:
  - **System Status**: Live inference and memory health indicators in the sidebar.
  - **Sentry**: Full-stack crash reporting, performance tracing, and user identification.

## System Architecture

### 1. Subnetwork Router
The `Router` (`src/lib/ai/router.ts`) analyzes every user message using semantic embeddings. It calculates the cosine similarity between the user's intent and the "Prototype Embedding" of each specialized agent.
- **Technical queries** -> Routed to *The Builder*.
- **Abstract queries** -> Routed to *The Universe*.

### 2. Unified Cognition (RAG)
Before generating a response, the system searches the `memories` collection in Qdrant for relevant facts and past interactions. These are injected into the LLM context as "Established Facts" or "Relevant Echoes".

### 3. Monitoring & Status
- **Frontend**: The generic Sidebar footer polls `/api/health/inference` and `/api/health/memory` to show Red/Green status dots.
- **Sentry**: Connected to both Client and Server.
  - **User ID**: Automatically tagged in Sentry issues via `useUser()` hook.
  - **Tracing**: Distributed tracing links frontend navigation to backend API processing.

## Environment Variables

### Required
- `INFERENCE_URL`: URL to your vLLM instance (e.g., `http://localhost:8000/v1`)
- `QDRANT_URL`: URL to your Qdrant instance (e.g., `http://localhost:6333`)
- `EMBEDDINGS_BASE_URL`: URL to your local embeddings service
- `LLM_API_KEY`: (Secret) API Key for the inference provider.
- Firebase Service Account (via Google Cloud Secrets in production).

### Local Infrastructure
When running locally:
```bash
INFERENCE_URL=http://localhost:11434 # For Ollama
INFERENCE_MODEL=llama3.2:latest
QDRANT_URL=http://localhost:6333
EMBEDDINGS_BASE_URL=https://pandora-embeddings... # or local 8080
```

### "Anti-Gravity" Infrastructure (Production)
The system uses a **VPC Peering/IAP Bridge** to reach local hardware:
- **Inference (Ollama)**: `10.128.0.4:11434`
- **Memory (Qdrant)**: `10.128.0.3:6333`
- **VPC Connector**: `pandora-vpc-connector` (us-central1)
```

## Cloud Run Deployment (VPC Connector Required)

**⚠️ CRITICAL:** When deploying to Cloud Run, you **must** configure a VPC Connector to access internal services (vLLM, Qdrant, Embeddings).

### Symptoms of Missing VPC Connector:
- Empty chat bubbles (no response from AI)
- Error messages: "Inference System Offline" or "Connection refused"
- Chat messages fail silently with empty responses

### Fix: Enable VPC Connector in Cloud Run

1. **Via Firebase App Hosting (`apphosting.yaml`):**
   ```yaml
   runConfig:
     vpcAccess:
       connector: projects/YOUR_PROJECT/locations/us-central1/connectors/pandora-vpc-connector
       egress: PRIVATE_RANGES_ONLY
   ```

2. **Via Google Cloud Console:**
   - Go to **Cloud Run** > Your Service > **Edit & Deploy New Revision**
   - Navigate to **Networking** tab
   - Under **VPC**, select **"Use Serverless VPC Access Connector"**
   - Choose your connector (or create one if missing)
   - Set **Egress** to **"Private IPs only"**
   - **Deploy**

3. **Via gcloud CLI:**
   ```bash
   gcloud run services update YOUR_SERVICE \
     --vpc-connector projects/YOUR_PROJECT/locations/us-central1/connectors/pandora-vpc-connector \
     --vpc-egress private-ranges-only
   ```

### Verify VPC Connector:
- Check Cloud Run service logs for connection errors
- Visit `/api/health/inference` - should return `{"status":"online"}`
- Chat should now show responses instead of empty bubbles

## Development

```bash
# Install dependencies
npm install

# Start local infrastructure
npm run infra:up

# Run Next.js development server
npm run dev

# Run Unit Tests (New)
npm test
```

## Deployment
This project is configured for **Firebase App Hosting**.
Secrets (like `LLM_API_KEY`) are managed via Google Cloud Secret Manager.
