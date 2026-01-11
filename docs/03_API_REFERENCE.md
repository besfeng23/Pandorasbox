# API Reference — Routes + Server Actions

## Purpose
Provide a complete inventory of the public API surface (Next.js API routes) and internal server actions, with behaviors derived from repo code.

## Authentication model (high-level)
- **First-party UI**: Firebase Auth; server actions verify `idToken` via Firebase Admin (`getAuthAdmin()` in `src/lib/firebase-admin.ts`).
- **ChatGPT Actions**: `CHATGPT_API_KEY` bearer token (or `x-api-key`).
- **MCP HTTP bridge**: `MCP_API_KEY` bearer token (fallback `CHATGPT_API_KEY`).
- **Cron**: some cron routes enforce `CRON_SECRET` (enforced in `/api/cron/context-decay` and `/api/cron/meta-learning`).

## Next.js API routes (`src/app/api/**/route.ts`)
Repo-derived from files under `src/app/api/`.

### ChatGPT Actions
#### `POST /api/chatgpt/store-memory`
- **File**: `src/app/api/chatgpt/store-memory/route.ts`
- **Auth**: `Authorization: Bearer <CHATGPT_API_KEY>` (or `x-api-key`)
- **Body**:
  - `memory` (string, required)
  - `user_email` (string, optional)
- **Behavior**:
  - Map `user_email` → Firebase UID (Admin)
  - Persist to `memories` via `saveMemory` (`src/lib/memory-utils.ts`)
- **Response**: `{ success, message, memory_id, user_id }`

Assumption: a default email is used when `user_email` is omitted; treat as a portability/privacy risk and move to a `DEFAULT_CHATGPT_USER_EMAIL` env var.

#### `GET|POST /api/chatgpt/retrieve-memories`
- **File**: `src/app/api/chatgpt/retrieve-memories/route.ts`
- **Auth**: `CHATGPT_API_KEY`
- **Params**:
  - `query?` (string)
  - `mode?` (`baseline|context`) — `context` uses `getContextualMemories` (`src/lib/context-manager.ts`)
  - `limit?` (1–50)
  - `user_email?` (string)
- **Response**: `{ success, count, memories[], user_id }`

#### `GET|POST /api/chatgpt/hybrid-retrieve`
- **File**: `src/app/api/chatgpt/hybrid-retrieve/route.ts`
- **Auth**: `CHATGPT_API_KEY`
- **Behavior**: calls `runHybridLane` (`src/ai/flows/run-hybrid-lane.ts`) which uses `hybridSearch` (`src/lib/hybrid-search.ts`).
- **Response**: includes `results` and `fused_context`.

### MCP HTTP bridge + schema
#### `POST /api/mcp/[...tool]`
- **File**: `src/app/api/mcp/[...tool]/route.ts`
- **Auth**: `MCP_API_KEY` (fallback `CHATGPT_API_KEY`)
- **Tools**:
  - `search_knowledge_base`
  - `add_memory`
  - `generate_artifact`

#### `GET /api/mcp/openapi`
- **File**: `src/app/api/mcp/openapi/route.ts`
- **Behavior**: serves `public/openapi-mcp.yaml` with YAML content-type.

#### `POST /api/mcp/runFlow`
- **File**: `src/app/api/mcp/runFlow/route.ts`
- **Auth**: `MCP_API_KEY` (fallback `CHATGPT_API_KEY`)
- **Behavior**: executes `runReasoningLane` or `runPlannerLane`.

### Cron endpoints (`src/app/api/cron/*`)
- **Cleanup**: `GET|POST /api/cron/cleanup` → `src/app/api/cron/cleanup/route.ts`
- **Daily briefing**: `GET|POST /api/cron/daily-briefing` → `src/app/api/cron/daily-briefing/route.ts`
- **Context decay**: `GET|POST /api/cron/context-decay` → `src/app/api/cron/context-decay/route.ts` (auth: `CRON_SECRET` if set)
- **Nightly reflection**: `GET|POST /api/cron/nightly-reflection` → `src/app/api/cron/nightly-reflection/route.ts`
- **Deep research**: `GET|POST /api/cron/deep-research` → `src/app/api/cron/deep-research/route.ts`
- **Reindex memories**: `GET|POST /api/cron/reindex-memories` → `src/app/api/cron/reindex-memories/route.ts`
- **Meta-learning**: `GET|POST /api/cron/meta-learning` → `src/app/api/cron/meta-learning/route.ts` (auth: `CRON_SECRET` if set)

### System APIs
- **Knowledge graph**: `GET|POST /api/system/knowledge` → `src/app/api/system/knowledge/route.ts`
- **Graph analytics**: `GET|POST /api/system/graph-analytics` → `src/app/api/system/graph-analytics/route.ts`

### Feedback API
- **Feedback**: `GET|POST /api/feedback` → `src/app/api/feedback/route.ts` (auth: `CHATGPT_API_KEY`)

## Server actions (`src/app/actions/*`)
### Chat (`src/app/actions/chat.ts`)
- `createThread(userId)`
- `getUserThreads(userId)`
- `transcribeAndProcessMessage(formData)`
- `submitUserMessage(formData)`
- `summarizeThread(threadId, userId)`
- `updateThread(threadId, userId, updates)`
- `deleteThread(threadId, userId)`

### Knowledge (`src/app/actions/knowledge.ts`)
- `searchMemoryAction(query, idToken)`
- `clearMemory(idToken)`
- `getMemories(idToken, query?)`
- `deleteMemory(id, idToken)` (history)
- `updateMemory(id, newText, idToken)` (history)
- `createMemoryFromSettings(content, idToken)` (memories)
- `deleteMemoryFromMemories(id, idToken)`
- `updateMemoryInMemories(id, newText, idToken)`
- `uploadKnowledge(formData)`
- `reindexMemories(idToken)`

### User (`src/app/actions/user.ts`)
- `updateSettings(formData)`
- `generateUserApiKey(idToken)`
- `exportUserData(idToken)`

### Brain controls (`src/app/actions/brain-actions.ts`)
- `seedIdentityProfile(userId)`
- `triggerReflection(userId)`
- `triggerDeepResearch(userId)`

## Where in code
- API routes: `src/app/api/**/route.ts`
- Server actions: `src/app/actions/*`
- MCP tools: `src/mcp/tools/*`
- OpenAPI schemas: `public/openapi-mcp.yaml`, `public/openapi-mcp.json`, `src/app/api/chatgpt/openapi.yaml`


