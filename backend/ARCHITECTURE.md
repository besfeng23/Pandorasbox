# Technical Design Document: Pandora's Box

**Version:** 1.0  
**Date:** January 2025  
**Project:** Pandora's Box - AI-Powered Chat Application with Long-Term Memory

---

## 1. Executive Summary

### What is this application?

**Pandora's Box** is a Next.js-based AI chat application that provides conversational AI with **persistent, long-term memory** using vector embeddings and semantic search. It enables users to have contextual conversations that persist across sessions, with the AI remembering past interactions and user knowledge.

### Primary Problem Solved

Traditional chat applications (like ChatGPT) have limited context windows and cannot remember past conversations beyond a session. Pandora's Box solves this by:

- **Persistent Memory**: All messages are converted to vector embeddings and stored in Firestore, enabling semantic search across the user's entire conversation history
- **Multi-Thread Conversations**: Users can organize conversations into threads, each with its own context
- **Knowledge Base Integration**: Users can upload documents (PDFs, text files) that are chunked, embedded, and made searchable
- **Context-Aware Responses**: The AI retrieves relevant past conversations and knowledge chunks to provide contextually relevant answers

---

## 2. Tech Stack

### Frontend

- **Framework**: Next.js 15.5.9 (App Router)
- **UI Library**: React 19.2.1
- **UI Components**: Radix UI (headless components) + custom shadcn/ui components
- **Styling**: Tailwind CSS 3.4.1 with CSS variables for theming
- **Theme System**: Dark/light mode toggle with ThemeProvider (`src/hooks/use-theme.tsx`)
- **State Management**: Zustand 4.5.4 (for client-side state like artifacts)
- **Animations**: Framer Motion 11.3.2
- **Icons**: Lucide React 0.475.0
- **Build Tool**: Turbopack (Next.js built-in)

### Backend

- **Runtime**: Node.js 20 (server-side)
- **Server Actions**: Next.js Server Actions (`'use server'`) for all backend logic
- **API Routes**: Next.js API routes for external integrations (ChatGPT Actions, MCP HTTP bridge, cron jobs)
- **Authentication**: Firebase Auth (client-side) + Firebase Admin SDK (server-side)
- **AI Clients**: Custom clients for vLLM (inference) and Qdrant (vector DB)

### Database & Storage

- **Primary Database**: Cloud Firestore (region: `asia-southeast1`)
  - **Collections**:
    - `history` - All messages with embeddings
    - `threads` - Conversation threads
    - `memories` - Searchable memory queries
    - `artifacts` - Generated code/markdown artifacts
    - `settings` - User preferences
    - `users/{userId}/state` - User state (context notes, suggestions)
    - `external_knowledge` - Phase 5: Cached external search results (query, source, content, confidence, cachedAt, url, title)
    - `feedback` - Phase 6: User feedback on search results (query, userId, resultIds, satisfaction, feedback)
    - `performance_metrics` - Phase 6: Search performance tracking (query, userId, internalCount, externalCount, avgConfidence, responseTime, userSatisfaction)
    - `meta_learning_state` - Phase 6: Per-user meta-learning state (internalWeight, externalWeight, learningRate, avgSatisfaction, strategy)
    - `system_logs` - System operation logs and telemetry
- **Vector Storage**: Qdrant Vector Database (local: `http://localhost:6333`)
  - **Embedding Model**: `all-MiniLM-L6-v2` (384 dimensions)
  - **Distance Measure**: COSINE similarity (handled by Qdrant)
- **File Storage**: Firebase Storage
  - Images: `uploads/{userId}/{messageId}.jpeg`
  - Knowledge documents processed server-side

### AI Engine

- **Primary Models**: vLLM with `mistralai/Mistral-7B-Instruct-v0.3` (configurable)
- **Embedding Model**: `all-MiniLM-L6-v2`
- **Voice Transcription**: Local or hosted Whisper (future work)

---

## 3. Architecture & Data Flow

### 3.1 The "Lanes" Architecture

The application uses a **three-lane architecture** to process user messages:

```
User Message
    ↓
┌─────────────────────────────────────────┐
│  runChatLane (Orchestrator)             │
│  - Creates placeholder assistant message│
│  - Coordinates Memory & Answer lanes    │
│  - Saves final response                 │
└─────────────────────────────────────────┘
    ├─────────────────┬───────────────────┤
    ↓                 ↓                   ↓
┌─────────────┐  ┌──────────────┐  ┌──────────────┐
│ Memory Lane │  │ Answer Lane  │  │ Follow-up    │
│             │  │              │  │ Questions    │
│ - Updates   │  │ - Retrieves  │  │ - Generates  │
│   context   │  │   memories   │  │   suggestions│
│ - Creates   │  │ - Fetches    │  │              │
│   memory    │  │   history    │  │              │
│   queries   │  │ - Generates  │  │              │
│             │  │   response   │  │              │
└─────────────┘  └──────────────┘  └──────────────┘
```

#### Lane Details:

1. **Memory Lane** (`src/ai/flows/run-memory-lane.ts`)
   - Analyzes the user message and current context
   - Updates the user's context note (stored in `users/{userId}/state/context`)
   - Generates search queries for future retrieval
   - Creates memory entries from search queries

2. **Answer Lane** (`src/ai/flows/run-answer-lane.ts`)
   - Retrieves **short-term memory** (last 6 messages in the thread)
   - Performs **vector search** to find relevant past conversations
   - Constructs a prompt with both memories
   - Generates the AI response
   - Extracts and saves artifacts (code/markdown blocks)
   - Creates an embedding of the response for future retrieval

3. **Chat Lane** (`src/ai/flows/run-chat-lane.ts`)
   - Orchestrates the Memory and Answer lanes
   - Triggers follow-up question generation
   - Optionally summarizes long threads (10+ messages)

### 3.2 The Memory Loop (Critical)

**How a user message becomes a Vector and gets retrieved:**

#### Step 1: Message Submission
```typescript
// User submits message via submitUserMessage() in src/app/actions.ts
const embedding = await generateEmbedding(messageContent);
// Uses OpenAI text-embedding-3-small → 1536-dimension vector
```

#### Step 2: Storage with Embedding
```typescript
const userMessageData = {
  role: 'user',
  content: messageContent,
  embedding: embedding,  // ← Vector stored here
  userId: userId,
  threadId: threadId,
  createdAt: FieldValue.serverTimestamp(),
};
await historyCollection.add(userMessageData);
```

#### Step 3: Retrieval (Vector Search)
```typescript
// In run-answer-lane.ts
const queryEmbedding = await generateEmbedding(message);
const vectorQuery = historyCollection
  .where('userId', '==', userId)
  .findNearest('embedding', queryEmbedding, {
    limit: 5,
    distanceMeasure: 'COSINE'
  });
const relevantDocs = await vectorQuery.get();
// Returns top 5 most semantically similar past messages
```

#### Step 4: Context Injection
```typescript
// Retrieved memories are injected into the system prompt
const finalSystemPrompt = `
--- LONG TERM MEMORY (User's Past) ---
${retrievedHistory}  // ← Past conversations

--- SHORT TERM MEMORY (Current Conversation) ---
${recentHistory}     // ← Last 6 messages
`;
```

**Key Points:**
- Every message (user and assistant) gets an embedding
- Embeddings are stored directly in Firestore documents (not a separate vector DB)
- Firestore's native `findNearest()` performs the vector search
- COSINE similarity measures semantic similarity (0 = identical, 2 = opposite)

### 3.3 Firebase Service Account Authentication

**Location**: `src/lib/firebase-admin.ts`

The backend uses Firebase Admin SDK to access Firestore and Storage with elevated privileges:

```typescript
// Development/Local: Uses service-account.json file
const serviceAccount = require('../../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

// Production: Falls back to Application Default Credentials (ADC)
// Uses the service account attached to the Cloud Run/App Engine instance
admin.initializeApp({
  credential: admin.credential.applicationDefault()
});
```

**Security Model:**
- Local development: `service-account.json` (gitignored)
- Production: Google Cloud Application Default Credentials (ADC)
- The service account has permissions to read/write all Firestore collections
- Client-side uses Firebase Client SDK (limited by Firestore Security Rules)

---

## 4. Key Features List

### Core Features

1. **Multi-Thread Chat**
   - Create multiple conversation threads
   - Thread management sidebar
   - Auto-title generation for new threads

2. **Long-Term Memory**
   - Vector embeddings for all messages
   - Semantic search across entire conversation history
   - Context notes stored per user

3. **Voice Input**
   - Browser-based audio recording (MediaRecorder API)
   - OpenAI Whisper transcription
   - Automatic message submission after transcription

4. **Image Support**
   - Image upload via chat input
   - Storage in Firebase Storage
   - Vision model support (GPT-4 Vision) for image analysis
   - Image descriptions stored in memory

5. **Knowledge Base Upload**
   - PDF and text file upload
   - Automatic chunking (1000 chars, 200 overlap)
   - Embedding generation for each chunk
   - Searchable via vector search

6. **Artifact Generation**
   - AI can generate code/markdown artifacts
   - Extracted from responses using `<artifact>` tags
   - Stored in `artifacts` collection
   - Split-view artifact viewer

7. **Follow-Up Suggestions**
   - AI-generated follow-up questions
   - Stored in user state
   - Displayed in chat input

8. **Thread Summarization**
   - Automatic summarization for threads with 10+ messages
   - Summary stored in thread document
   - Uses Genkit flow

9. **Settings & Customization**
   - Model selection (gpt-4o, gpt-4-turbo, gpt-3.5-turbo)
   - Reply style (concise/detailed)
   - System prompt override
   - Personal API key generation

10. **Memory Management**
    - Memory inspector (view all stored memories)
    - Edit/delete individual memories
    - Clear all memory (danger zone)
    - Search memory database

11. **Real-Time Progress Tracking**
    - Assistant messages show progress logs
    - Status indicators (processing/complete/error)
    - Thinking indicator in UI

12. **Command Menu**
    - Keyboard shortcuts (Cmd/Ctrl+K)
    - Quick navigation
    - Command palette UI
    - Memory search integration

13. **Theme System**
    - Dark/light mode toggle
    - Theme persistence in localStorage
    - CSS variables for both themes
    - Glassmorphism effects for both themes

14. **Keyboard Shortcuts**
    - Cmd/Ctrl+K - Open command menu
    - Cmd/Ctrl+B - Toggle sidebar
    - Enter - Send message
    - Shift+Enter - New line
    - Esc - Close dialogs
    - Keyboard shortcuts documentation in Settings

15. **MCP (Model Context Protocol) Integration**
    - MCP server for Claude Desktop (`src/mcp/index.ts`)
    - HTTP bridge for ChatGPT Actions (`src/app/api/mcp/[...tool]/route.ts`)
    - Three MCP tools: search_knowledge_base, add_memory, generate_artifact
    - OpenAPI schema generation (YAML and JSON formats)

16. **ChatGPT Actions Integration**
    - Store memory endpoint (`/api/chatgpt/store-memory`)
    - Retrieve memories endpoint (`/api/chatgpt/retrieve-memories`)
    - OpenAPI schema for ChatGPT Actions
    - API key authentication

17. **Scheduled Tasks**
    - Memory cleanup cron job (`/api/cron/cleanup`)
    - Daily briefing cron job (`/api/cron/daily-briefing`)
    - Cloud Scheduler integration

18. **Rate Limiting**
    - Token bucket algorithm
    - Per-user rate limits (30 messages/min, 10 uploads/hour)
    - Rate limit status tracking

19. **Error Monitoring**
    - Sentry integration
    - Error tracking in all server actions
    - Production error logging

---

## 5. Infrastructure Map

### Deployment Target

**Firebase App Hosting** (Primary)
- Configuration: `firebase.json` → `apphosting` section
- Backend ID: `studio`
- Root Directory: `/`
- Region: `us-central1` (for frameworks backend)
- Build Command: `npm run build`
- Start Command: `npm run dev` (local) / `npm start` (production)

**Firebase Functions** (Secondary - Multiple codebases)
- `functions/` - Default codebase (Node.js 20)
- `def/` - Additional function codebase
- `defa/` - Additional function codebase
- Region: Not specified (uses default)

**Firestore Database**
- Region: `asia-southeast1`
- Database ID: `(default)`

### Security Model

#### Environment Variables (`.env.local`)

**Public Variables** (exposed to client):
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

**Secret Variables** (server-only):
- `FIREBASE_SERVICE_ACCOUNT_KEY` - Service account key for Firebase Admin SDK
- `CRON_SECRET` - Secret for securing cron job API routes
- `INFERENCE_URL` - URL for the vLLM inference server
- `INFERENCE_MODEL` - Model name used by the vLLM server (e.g., `mistralai/Mistral-7B-Instruct-v0.3`)
- `QDRANT_URL` - URL for the Qdrant vector database
- `EMBEDDING_MODEL` - Model name for embedding generation (e.g., `all-MiniLM-L6-v2`)
- `TAVILY_API_KEY` - Tavily web search API key used by the Deep Research Agent

**Service Account**:
- Local: `service-account.json` (file-based, gitignored)
- Production: Application Default Credentials (ADC) via Google Cloud

#### Firestore Security Rules

```javascript
// Only authenticated users can access their own data
match /settings/{userId} {
  allow read, write: if request.auth.uid == userId;
}
match /users/{userId}/{document=**} {
  allow read, write: if request.auth.uid == userId;
}
```

**Note**: All collections (`history`, `threads`, `memories`, `artifacts`) are now protected by client-side security rules. They are accessed server-side via Firebase Admin SDK (which bypasses rules), but client-side rules provide defense-in-depth security.

---

## 6. Folder Structure Guide

### `/src/app/`
Next.js App Router pages and Server Actions
- `page.tsx` - Home page (renders PandorasBox component)
- `layout.tsx` - Root layout with Firebase provider and ThemeProvider
- `actions.ts` - All Server Actions (message submission, memory operations, file upload)
- `settings/page.tsx` - Settings page UI
- `api/` - API routes
  - `chatgpt/` - ChatGPT Actions endpoints (store-memory, retrieve-memories, openapi.yaml)
  - `mcp/[...tool]/route.ts` - MCP HTTP bridge for ChatGPT Actions
  - `cron/` - Scheduled task endpoints (cleanup, daily-briefing)

### `/src/components/`
React components organized by feature
- `artifacts/` - Artifact viewer and list components
- `auth/` - Authentication components (login, email form, auth guard)
- `chat/` - Chat UI components (messages, input, sidebar, voice input)
- `layout/` - Layout components (command rail, memory inspector)
- `pandoras-box.tsx` - Main application container
- `settings/` - Settings page components (memory table, knowledge upload)
- `keyboard-shortcuts.tsx` - Keyboard shortcuts dialog component
- `SettingsModal.tsx` - Settings modal with theme toggle
- `ui/` - Reusable UI components (shadcn/ui based: buttons, cards, dialogs, etc.)

### `/src/lib/`
Core utilities and libraries
- `chunking.ts` - Text chunking logic for knowledge base
- `firebase-admin.ts` - Firebase Admin SDK initialization
- `firebase.ts` - Client-side Firebase initialization
- `types.ts` - TypeScript type definitions
- `utils.ts` - General utilities (cn, etc.)
- `vector.ts` - Embedding generation and vector search functions
  - `generateEmbedding()` - Single embedding generation
  - `generateEmbeddingsBatch()` - Batch embedding generation
  - `searchHistory()` - Search history collection
  - `searchMemories()` - Search memories collection
- `rate-limit.ts` - Rate limiting implementation (token bucket algorithm)
- `analytics.ts` - Event tracking and user statistics
- `tavily.ts` - Tavily web search helper used by the Deep Research Agent
- `hybrid-search.ts` - Phase 5: Hybrid search combining internal memories with external web results (Phase 6: uses adaptive weights)
- `external-cache.ts` - Phase 5: External knowledge result caching
- `meta-learning.ts` - Phase 6: Meta-learning and continuous self-improvement (performance tracking, weight adaptation)
- `feedback-manager.ts` - Phase 6: Feedback collection and analysis system
- `performance-tracker.ts` - Phase 6: Performance metrics tracking for search operations
- `adaptive-weights.ts` - Phase 6: Dynamic weight adjustment based on user performance

### `/src/ai/`
AI orchestration using Genkit
- `genkit.ts` - Genkit AI instance initialization
- `dev.ts` - Development utilities
- `flows/` - Genkit flow definitions
  - `run-memory-lane.ts` - Memory processing flow
  - `run-chat-lane.ts` - Chat orchestration flow
  - `run-answer-lane.ts` - Response generation flow (also performs self-evaluation for low-confidence topics)
  - `suggest-follow-up-questions.ts` - Follow-up question generation
  - `summarize-long-chat.ts` - Thread summarization flow
  - `run-hybrid-lane.ts` - Phase 5: Hybrid reasoning flow combining internal and external knowledge
  - `run-self-improvement.ts` - Phase 6: Self-improvement flow for meta-learning and continuous optimization
- `agents/` - Background / offline agents
  - `nightly-reflection.ts` - Nightly reflection agent that analyzes interactions and creates insight memories
  - `deep-research.ts` - Deep Research Agent that self-studies low-confidence topics from `learning_queue` and stores acquired knowledge

### `/src/mcp/`
Model Context Protocol (MCP) server implementation
- `index.ts` - MCP server main entry point (stdio transport)
- `types.ts` - MCP tool type definitions
- `tools/` - MCP tool implementations
  - `search-knowledge.ts` - Semantic search tool
  - `add-memory.ts` - Memory storage tool
  - `generate-artifact.ts` - Artifact creation tool

### `/src/firebase/`
Firebase client-side integration
- `config.ts` - Public Firebase configuration (safe to expose)
- `index.ts` - Firebase initialization and exports
- `provider.tsx` - Firebase context provider
- `client-provider.tsx` - Client SDK provider wrapper
- `auth/use-user.tsx` - User authentication hook

### `/src/hooks/`
Custom React hooks
- `use-chat-history.ts` - Real-time chat history subscription hook
- `use-settings.ts` - User settings data hook with Firestore subscription
- `use-suggestions.ts` - Follow-up question suggestions hook
- `use-debounce.ts` - Debounce utility hook
- `use-mobile.tsx` - Mobile device detection hook
- `use-toast.ts` - Toast notification system hook
- `use-theme.tsx` - Theme management hook (dark/light mode toggle)

### `/src/store/`
Zustand state management stores
- `artifacts.ts` - Artifact selection state (active artifact ID)
- `connection.ts` - Connection status and latency tracking

### Root Configuration Files
- `package.json` - Dependencies and scripts
- `firebase.json` - Firebase project configuration
- `.firebaserc` - Firebase project aliases
- `firestore.rules` - Firestore security rules (all collections protected)
- `firestore.indexes.json` - Firestore composite indexes
- `storage.rules` - Firebase Storage security rules
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `service-account.json` - Firebase Admin service account (gitignored)
- `apphosting.yaml` - Firebase App Hosting configuration
- `scripts/generate-schema.ts` - OpenAPI schema generator for MCP tools

### `/public/`
Public static files
- `openapi-mcp.yaml` - OpenAPI schema in YAML format (for ChatGPT Actions)
- `openapi-mcp.json` - OpenAPI schema in JSON format
- `manifest.json` - PWA manifest

---

## 7. Data Models & Types

### Core Type Definitions (`src/lib/types.ts`)

```typescript
// Message stored in Firestore 'history' collection
type Message = {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: Timestamp | Date;
  threadId?: string;
  embedding?: number[];  // 1536-dim vector
  imageUrl?: string;
  imageDescription?: string;
  source?: 'text' | 'voice';
  type?: 'briefing' | 'standard' | 'knowledge_chunk';
  status?: 'processing' | 'complete' | 'error';
  progress_log?: string[];
  source_filename?: string;
  userId?: string;
  editedAt?: Timestamp | Date;
};

// Thread stored in Firestore 'threads' collection
type Thread = {
  id: string;
  userId: string;
  title: string;
  createdAt: Timestamp | Date | string;
  summary?: string;  // AI-generated summary for long threads
};

// Artifact stored in Firestore 'artifacts' collection
type Artifact = {
  id: string;
  userId: string;
  title: string;
  type: 'markdown' | 'code';
  content: string;
  version: number;
  createdAt: Timestamp | Date;
};

// User settings stored in Firestore 'settings' collection
type AppSettings = {
  active_model: 'gpt-4o' | 'gpt-4-turbo' | 'gpt-3.5-turbo';
  reply_style: 'concise' | 'detailed';
  system_prompt_override: string;
  personal_api_key?: string;
};

// External knowledge cache stored in Firestore 'external_knowledge' collection (Phase 5)
type ExternalKnowledgeCache = {
  query: string; // Normalized (lowercase) search query
  source: string; // Source identifier (e.g., 'tavily')
  content: string; // Cached content/snippet
  confidence: number; // Confidence score (0.0 to 1.0)
  url?: string; // Source URL
  title?: string; // Result title
  cachedAt: Timestamp; // Cache timestamp
};
```

---

## 8. Development Workflow

### Local Development

1. **Prerequisites**:
   - Node.js 20+
   - Firebase CLI installed (`npm install -g firebase-tools`)
   - Firebase project created and `.firebaserc` configured
   - Service account key file (`service-account.json`) in project root

2. **Environment Setup**:
   ```bash
   # Install dependencies
   npm install
   
   # Create .env.local with required environment variables
   # (See Security Model section for required variables)
   ```

3. **Running Locally**:
   ```bash
   # Start Next.js dev server (port 9002)
   npm run dev
   
   # Start Genkit dev server (separate terminal)
   npm run genkit:dev
   ```

4. **Firebase Emulators** (Optional):
   - Configured in `firebase.json`
   - App Hosting emulator: port 5002
   - Functions emulator: port 5001
   - Hosting emulator: port 5000

### Deployment

1. **Build**:
   ```bash
   npm run build
   ```

2. **Deploy to Firebase**:
   ```bash
   firebase deploy
   # Or deploy specific services:
   firebase deploy --only hosting
   firebase deploy --only functions
   ```

3. **Environment Variables**:
   - Set in Firebase Console → Project Settings → Environment Variables
   - Or via Firebase CLI for functions
   - Service account uses ADC in production (no file needed)

---

## 9. Key Design Decisions & Rationale

1. **Qdrant vs. Firestore Native Vector Search**
   - **Decision**: Use Qdrant as a dedicated vector database.
   - **Rationale**: Qdrant offers advanced vector search capabilities, better performance for large datasets, and more flexibility compared to Firestore's native vector search. It aligns with the self-hosted sovereign AI stack.

2. **Server Actions vs. API Routes**
   - **Decision**: Next.js Server Actions for all backend operations
   - **Rationale**: Type-safe, simpler code, better integration with React

3. **Genkit vs. Direct OpenAI SDK**
   - **Decision**: Genkit for flow orchestration, OpenAI SDK for direct calls
   - **Rationale**: Genkit provides flow structure and future extensibility, OpenAI SDK for embeddings/transcription

4. **Embedding Every Message**
   - **Decision**: Generate embeddings for both user and assistant messages
   - **Rationale**: Enables bidirectional search, better context retrieval

5. **Chunking Strategy**
   - **Decision**: 1000 characters with 200 character overlap
   - **Rationale**: Balances context preservation with embedding cost

---

## 10. Known Limitations & Future Considerations

### Current Limitations

1. ~~**Security Rules**: Some collections lack client-side security rules~~ ✅ **FIXED** - All collections now have security rules
2. ~~**Rate Limiting**: No rate limiting on API calls or embeddings~~ ✅ **FIXED** - Token bucket algorithm implemented
3. ~~**Cost Optimization**: All messages embedded immediately~~ ✅ **FIXED** - Batch embedding generation implemented
4. **Vector Index**: Firestore vector indexes may take time to build for large datasets
5. ~~**Memory Cleanup**: No automatic cleanup of old memories or threads~~ ✅ **FIXED** - Automated cleanup via Cloud Scheduler

### Future Enhancements

1. **Multi-Modal Memory**: Enhanced image memory with vision embeddings
2. **Memory Compression**: Summarize and compress old memories
3. ~~**Export/Import**: User data export functionality~~ ✅ **IMPLEMENTED** - GDPR-compliant JSON export
4. **Collaboration**: Shared threads or knowledge bases
5. **Plugin System**: Extensible plugin architecture for custom flows
6. ~~**Analytics**: Usage analytics and memory effectiveness metrics~~ ✅ **IMPLEMENTED** - Event tracking system

---

## 11. Troubleshooting Guide

### Common Issues

1. **Vector Search Not Working**
   - Check if Firestore vector index is built: Firebase Console → Firestore → Indexes
   - Verify embedding field exists in documents
   - Check distance measure matches (COSINE)

2. **Service Account Authentication Fails**
   - Verify `service-account.json` exists in project root
   - Check file permissions
   - In production, verify ADC is configured

3. **Messages Not Appearing**
   - Check Firestore security rules
   - Verify user authentication
   - Check browser console for errors
   - Verify `threadId` is correctly set

4. **Embeddings Generation Fails**
   - Verify `OPENAI_API_KEY` is set
   - Check API quota/limits
   - Verify text is not empty

---

## 12. API Reference (Server Actions)

### `submitUserMessage(formData: FormData)`
Creates a new user message and triggers AI response generation.
- **Input**: `message`, `userId`, `threadId?`, `image_data?`, `source?`
- **Returns**: `{ messageId, threadId }`

### `transcribeAndProcessMessage(formData: FormData)`
Transcribes audio and processes as a message.
- **Input**: `audio_file`, `userId`, `threadId?`
- **Returns**: `{ success, messageId?, threadId? }`

### `getUserThreads(userId: string)`
Retrieves all threads for a user.
- **Returns**: `Thread[]`

### `uploadKnowledge(formData: FormData)`
Uploads and indexes a knowledge document.
- **Input**: `file`, `userId`
- **Returns**: `{ success, message, chunks? }`

### `getMemories(userId: string, query?: string)`
Retrieves user memories, optionally filtered by search query.
- **Returns**: `Memory[]`

### `updateSettings(formData: FormData)`
Updates user settings.
- **Input**: `active_model`, `reply_style`, `system_prompt_override`, `userId`
- **Returns**: `{ success, message }`

### `clearMemory(userId: string)`
Deletes all user data (history, memories, artifacts, threads).
- **Returns**: `{ success, message }`

### `exportUserData(userId: string)`
Exports all user data as JSON (GDPR compliance).
- **Returns**: `{ success, data }` - JSON object with all user data

### `generateUserApiKey(userId: string)`
Generates a personal API key for the user.
- **Returns**: `{ success, apiKey }`

---

## 13. External Integrations

### ChatGPT Actions
- **Endpoints**: `/api/chatgpt/store-memory`, `/api/chatgpt/retrieve-memories`
- **Schema**: `/api/chatgpt/openapi.yaml`
- **Authentication**: Bearer token (CHATGPT_API_KEY)
- **Purpose**: Allow ChatGPT to store and retrieve memories from Pandora's Box

### MCP (Model Context Protocol)
- **Server**: Stdio-based MCP server (`src/mcp/index.ts`)
- **HTTP Bridge**: `/api/mcp/{tool_name}` for ChatGPT Actions compatibility
- **Tools**: 
  - `search_knowledge_base` - Semantic search
  - `add_memory` - Store memories
  - `generate_artifact` - Create artifacts
- **Schema**: `public/openapi-mcp.yaml` (YAML) and `public/openapi-mcp.json` (JSON)
- **Authentication**: Bearer token (MCP_API_KEY or CHATGPT_API_KEY)
- **Usage**: Claude Desktop (stdio) or ChatGPT Actions (HTTP)

### Cloud Scheduler
- **Cleanup Job**: Daily cleanup of old data (`/api/cron/cleanup`)
- **Daily Briefing**: Scheduled daily briefings (`/api/cron/daily-briefing`)
- **Configuration**: Managed via Cloud Scheduler console or setup scripts

---

**Document Version**: 1.1  
**Last Updated**: January 2025  
**Author**: Technical Architecture Team

