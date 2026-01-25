# Pandora's Box Architecture

This document outlines the architecture for "Pandora's Box", a self-hosted, sovereign AI application.

## System Overview

Pandora is a "Sovereign AI" stack, meaning it runs entirely on infrastructure you control (local or private cloud), with NO external API dependencies for its core intelligence.

### Core Components

1.  **Frontend (The Face):**
    *   **Framework:** Next.js (App Router)
    *   **UI Library:** Tailwind CSS + shadcn/ui
    *   **Role:** Handles user interaction, chat interface, memory dashboard, and artifact rendering.
    *   **State:** Uses `useChatHistory` hook subscribed to Firestore for real-time updates.

2.  **Backend API (The Nervous System):**
    *   **Framework:** Next.js API Routes (Serverless/Edge)
    *   **Endpoints:**
        *   `/api/chat`: Handles streaming inference and RAG pipeline.
        *   `/api/agents`: Lists available agents (Builder, Universe).
        *   `/api/health/*`: Checks status of vLLM and Qdrant.
    *   **Role:** Orchestrates data flow between the user, the database, and the AI model.

3.  **The Brain (Inference):**
    *   **Engine:** vLLM (running `mistralai/Mistral-7B-Instruct-v0.3`)
    *   **Protocol:** OpenAI-compatible JSON-RPC (at `http://localhost:8000/v1`)
    *   **Hardware:** Requires NVIDIA GPU (T4/L4 or better).

4.  **The Memory (Long-term Storage):**
    *   **Vector DB:** Qdrant (running at `http://localhost:6333`)
    *   **Embeddings:** Local embedding model (e.g., `BAAI/bge-small-en-v1.5`) via `http://localhost:8080` or direct library.
    *   **Role:** Stores semantic embeddings of all chat history and uploaded knowledge.

5.  **The Ledger (Sync & Auth):**
    *   **Service:** Firebase (Firestore + Auth)
    *   **Role:** Handles user authentication, real-time message syncing, and structured data storage (threads, settings).

## Data Flow: "The Sovereign Lane"

When a user sends a message:

1.  **Client:** `submitUserMessage` (Server Action) writes the user message to Firestore immediately.
2.  **Client:** The UI immediately calls `POST /api/chat` to start the inference stream.
3.  **API (`/api/chat`):**
    *   **Guardrails:** Checks input validity.
    *   **RAG:** If message length > 5 chars, calls `searchMemoryAction`.
    *   **Search:** Converts query to vector -> Searches Qdrant -> Returns relevant context.
    *   **Prompting:** Injects "Sovereign System Prompt" + Context + User Message.
    *   **Inference:** Streams tokens from vLLM (`http://localhost:8000/v1`).
    *   **Save:** On stream completion, saves the assistant's response to Firestore.
4.  **Client:** Reads the stream and updates the UI. Firestore listener confirms the final state.

## Security

*   **Air-Gapped Ready:** The core AI loop (vLLM + Qdrant) works without internet access.
*   **Authentication:** Firebase Auth ensures only authorized users can access the API.
*   **Input Validation:** Guardrails prevent empty or malformed requests.
*   **Headers:** Strict security headers (CSP, HSTS equivalent) configured in `next.config.ts`.

## Development

*   **Run Local:** `npm run dev` (starts Next.js).
*   **Run Infra:** `docker-compose up -d` (starts vLLM, Qdrant, Embeddings).
*   **Deploy:** See `backend/scripts/deploy_sovereign.sh`.
