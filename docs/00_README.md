# Pandora’s Box — Documentation Index

## Purpose
This `/docs` set is the production documentation for **Pandora’s Box** (AI chat app with persistent memory, threads, artifacts, knowledge uploads, cron agents, MCP tools, and a phase-based roadmap).

All sections are **repo-derived**. If something cannot be proven from the repository, it is explicitly labeled as `Assumption:`.

## System map (at a glance)
- **Frontend (Next.js App Router)**: `src/app/(pandora-ui)/*` (primary UI), plus legacy UI components in `src/components/*`.
- **Server actions**: `src/app/actions/*` (chat, knowledge, user, brain controls).
- **HTTP API routes**: `src/app/api/**/route.ts` (ChatGPT Actions, MCP HTTP bridge, cron, system analytics).
- **AI orchestration**: `src/ai/flows/*` (lanes) and `src/ai/agents/*` (offline/cron agents).
- **Core libraries**: `src/lib/*` (vector search, memory utils, hybrid search, knowledge graph, context, meta-learning).
- **Persistence**: Firestore + Storage. Rules/indexes in `firestore.rules`, `firestore.indexes.json`, `storage.rules`.
- **Deployment**: Firebase App Hosting (Cloud Run) via `firebase.json` + `apphosting.yaml`; runbooks in `DEPLOYMENT_RUNBOOK*.md`.

## How to run (developer)
### Local development
- **Install**: `npm install`
- **Dev server**: `npm run dev` (configured to use port 9002; see `package.json`)
- **Genkit dev**: `npm run genkit:dev`
- **MCP server (stdio)**: `npm run mcp:dev`

### Required environment variables
The repo uses environment variables across server actions, flows, and API routes (e.g. `OPENAI_API_KEY`, `TAVILY_API_KEY`, `CHATGPT_API_KEY`, `MCP_API_KEY`, `CRON_SECRET`, Firebase Admin credentials). See:
- **Deployment**: `apphosting.yaml` and `DEPLOYMENT_RUNBOOK_V2.md`
- **Security model**: `docs/06_SECURITY_PRIVACY.md`

## How to deploy / operate
See `docs/07_OPERATIONS_RUNBOOK.md` and the repo runbooks:
- `DEPLOYMENT_RUNBOOK.md`
- `DEPLOYMENT_RUNBOOK_V2.md`

## Docs navigation
- **Architecture**: [`docs/01_ARCHITECTURE.md`](01_ARCHITECTURE.md)
- **Data model**: [`docs/02_DATA_MODEL.md`](02_DATA_MODEL.md)
- **API reference**: [`docs/03_API_REFERENCE.md`](03_API_REFERENCE.md)
- **Frontend system**: [`docs/04_FRONTEND_SYSTEM.md`](04_FRONTEND_SYSTEM.md)
- **Backend system**: [`docs/05_BACKEND_SYSTEM.md`](05_BACKEND_SYSTEM.md)
- **Security & privacy**: [`docs/06_SECURITY_PRIVACY.md`](06_SECURITY_PRIVACY.md)
- **Ops runbook**: [`docs/07_OPERATIONS_RUNBOOK.md`](07_OPERATIONS_RUNBOOK.md)
- **Test strategy**: [`docs/08_TEST_STRATEGY.md`](08_TEST_STRATEGY.md)
- **Roadmap & status**: [`docs/09_ROADMAP_AND_STATUS.md`](09_ROADMAP_AND_STATUS.md)
- **Kairos control tower spec**: [`docs/10_KAIROS_CONTROL_TOWER_SPEC.md`](10_KAIROS_CONTROL_TOWER_SPEC.md)
- **Linear project plan (WBS)**: [`docs/11_LINEAR_PROJECT_PLAN.md`](11_LINEAR_PROJECT_PLAN.md)
- **Kairos snapshot**: [`docs/STATUS.md`](STATUS.md) (generated)
- **Kairos automation spec**: [`docs/PROJECT_AUTOMATION_PLAN.md`](PROJECT_AUTOMATION_PLAN.md)
- **Linear setup**: [`docs/LINEAR_SETUP.md`](LINEAR_SETUP.md)
- **Quickstart (docs + status + Linear)**: [`docs/QUICKSTART_DOCS_AND_LINEAR.md`](QUICKSTART_DOCS_AND_LINEAR.md)

## Glossary (canonical terms)
- **Thread**: A conversation container stored in Firestore `threads` (see `src/app/actions/chat.ts` and `src/hooks/use-chat-history.ts`).
- **Message**: A chat message stored in Firestore `history` (see `src/app/actions/chat.ts`, `src/ai/flows/run-chat-lane.ts`).
- **Memory**: A long-term memory item stored in Firestore `memories`, embedded for vector search (see `src/lib/memory-utils.ts`, `src/lib/vector.ts`).
- **Artifact**: Code/markdown captured from AI responses and stored in Firestore `artifacts` (see `src/ai/flows/run-answer-lane.ts`).
- **Lane**: An AI flow in `src/ai/flows/*` (e.g. Chat lane, Memory lane, Answer lane).
- **Agent**: A scheduled/offline job in `src/ai/agents/*` (e.g. nightly reflection, deep research).
- **MCP**: Model Context Protocol server (`src/mcp/*`) plus HTTP bridge (`src/app/api/mcp/*`).
- **Phase**: A roadmap stage seeded into `system_phases` (`scripts/seed-phases.ts`) and visualized in the UI (`src/app/(pandora-ui)/components/PhaseDashboard.tsx`).


