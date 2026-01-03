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
- **State Management**: Zustand 4.5.4 (for client-side state like artifacts)
- **Animations**: Framer Motion 11.3.2
- **Icons**: Lucide React 0.475.0
- **Build Tool**: Turbopack (Next.js built-in)

### Backend

- **Runtime**: Node.js 20 (server-side)
- **Server Actions**: Next.js Server Actions (`'use server'`) for all backend logic
- **Authentication**: Firebase Auth (client-side) + Firebase Admin SDK (server-side)
- **API Client**: OpenAI SDK 4.52.7

### Database & Storage

- **Primary Database**: Cloud Firestore (region: `asia-southeast1`)
  - **Collections**:
    - `history` - All messages with embeddings
    - `threads` - Conversation threads
    - `memories` - Searchable memory queries
    - `artifacts` - Generated code/markdown artifacts
    - `settings` - User preferences
    - `users/{userId}/state` - User state (context notes, suggestions)
- **Vector Storage**: Firestore native vector search (using `findNearest()`)
  - **Embedding Model**: OpenAI `text-embedding-3-small` (1536 dimensions)
  - **Distance Measure**: COSINE similarity
- **File Storage**: Firebase Storage
  - Images: `uploads/{userId}/{messageId}.jpeg`
  - Knowledge documents processed server-side

### AI Engine

- **Framework**: Genkit 1.27.0 (Google's AI orchestration framework)
- **Primary Models**: OpenAI GPT models (configurable: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`)
- **Embedding Model**: OpenAI `text-embedding-3-small`
- **Voice Transcription**: OpenAI Whisper (`whisper-1`)
- **Library Integration**: 
  - `@genkit-ai/firebase` - Firebase integration for Genkit
  - `@genkit-ai/google-genai` - Google Gemini integration (available but not primary)

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
- `OPENAI_API_KEY` - OpenAI API access
- `GEMINI_API_KEY` - Google Gemini (optional)
- `MEMORY_API_KEY` - Placeholder (not currently used)

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

**Note**: The `history`, `threads`, `memories`, and `artifacts` collections are **not** protected by client-side rules. They are accessed server-side via Firebase Admin SDK, which bypasses security rules. Client-side access should be restricted or added to security rules.

---

## 6. Folder Structure Guide

### `/src/app/`
Next.js App Router pages and Server Actions
- `page.tsx` - Home page (renders PandorasBox component)
- `layout.tsx` - Root layout with Firebase provider
- `actions.ts` - All Server Actions (message submission, memory operations, file upload)
- `settings/page.tsx` - Settings page UI

### `/src/components/`
React components organized by feature
- `artifacts/` - Artifact viewer and list components
- `auth/` - Authentication components (login, email form, auth guard)
- `chat/` - Chat UI components (messages, input, sidebar, voice input)
- `layout/` - Layout components (command rail, memory inspector)
- `pandoras-box.tsx` - Main application container
- `settings/` - Settings page components (memory table, knowledge upload)
- `ui/` - Reusable UI components (shadcn/ui based: buttons, cards, dialogs, etc.)

### `/src/lib/`
Core utilities and libraries
- `chunking.ts` - Text chunking logic for knowledge base
- `firebase-admin.ts` - Firebase Admin SDK initialization
- `firebase.ts` - Client-side Firebase initialization
- `types.ts` - TypeScript type definitions
- `utils.ts` - General utilities (cn, etc.)
- `vector.ts` - Embedding generation and vector search functions

### `/src/ai/`
AI orchestration using Genkit
- `genkit.ts` - Genkit AI instance initialization
- `dev.ts` - Development utilities
- `flows/` - Genkit flow definitions
  - `run-memory-lane.ts` - Memory processing flow
  - `run-chat-lane.ts` - Chat orchestration flow
  - `run-answer-lane.ts` - Response generation flow
  - `suggest-follow-up-questions.ts` - Follow-up question generation
  - `summarize-long-chat.ts` - Thread summarization flow

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

### `/src/store/`
Zustand state management stores
- `artifacts.ts` - Artifact selection state (active artifact ID)
- `connection.ts` - Connection status and latency tracking

### Root Configuration Files
- `package.json` - Dependencies and scripts
- `firebase.json` - Firebase project configuration
- `.firebaserc` - Firebase project aliases
- `firestore.rules` - Firestore security rules
- `firestore.indexes.json` - Firestore composite indexes
- `next.config.ts` - Next.js configuration
- `tailwind.config.ts` - Tailwind CSS configuration
- `tsconfig.json` - TypeScript configuration
- `service-account.json` - Firebase Admin service account (gitignored)

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

1. **Firestore Vector Search vs. Separate Vector DB**
   - **Decision**: Use Firestore's native vector search
   - **Rationale**: Simpler architecture, no additional infrastructure, adequate for scale

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

1. **Security Rules**: Some collections (`history`, `threads`, `memories`, `artifacts`) lack client-side security rules (accessed server-side only)
2. **Rate Limiting**: No rate limiting on API calls or embeddings
3. **Cost Optimization**: All messages embedded immediately (could be optimized with batching)
4. **Vector Index**: Firestore vector indexes may take time to build for large datasets
5. **Memory Cleanup**: No automatic cleanup of old memories or threads

### Future Enhancements

1. **Multi-Modal Memory**: Enhanced image memory with vision embeddings
2. **Memory Compression**: Summarize and compress old memories
3. **Export/Import**: User data export functionality
4. **Collaboration**: Shared threads or knowledge bases
5. **Plugin System**: Extensible plugin architecture for custom flows
6. **Analytics**: Usage analytics and memory effectiveness metrics

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

---

**Document Version**: 1.0  
**Last Updated**: January 2025  
**Author**: Technical Architecture Team

