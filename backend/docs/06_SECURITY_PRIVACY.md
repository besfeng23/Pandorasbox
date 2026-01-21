# Security & Privacy — AuthN/AuthZ, Rules, Secrets, PII

## Purpose
Document the auth model, authorization boundaries, rules assumptions, PII risks, logging redaction, API key handling, and data export rules.

## Repo facts (not assumptions)
### Authentication (AuthN)
- Uses **Firebase Auth** in the UI, wrapped by `AuthGuard` (`src/components/auth/auth-guard.tsx`).
- Server-side verifies Firebase ID tokens via Firebase Admin (`getAuthAdmin()` in `src/lib/firebase-admin.ts`).

### Authorization (AuthZ)
- Firestore access is controlled by `firestore.rules`.\n- Most user-owned documents use `userId` equality checks.\n- Some shared collections are read-only to clients (writes denied), implying server-side Admin writes for maintenance/telemetry.

### API keys / secrets
Repo uses environment variables (`process.env.*`) across flows and API routes.\n\nExamples (repo-derived via `process.env` usage):\n- `OPENAI_API_KEY` (embeddings + chat)\n- `TAVILY_API_KEY` (external search)\n- `CHATGPT_API_KEY` (ChatGPT Actions endpoints)\n- `MCP_API_KEY` (MCP HTTP bridge)\n- `CRON_SECRET` (cron endpoints)\n- Firebase Admin credentials (see `src/lib/firebase-admin.ts` and `src/lib/firebase.ts`)

### Data export
User data export is implemented in `src/app/actions/user.ts` (`exportUserData`), returning a JSON archive (threads/history/memories/settings/artifacts).

## Findings (automated + manual)
### Hardcoded identifiers
`scripts/generate-status.ts` scans for hardcoded emails and URLs in:\n- `src/app/api/**/route.ts`\n- `src/lib/**/*.ts`\n- `src/mcp/**/*.ts`\n- OpenAPI files\n\nIf present, they are reported in:\n- `docs/STATUS.md` → Top Risks\n- `docs/status.json` → `topRisks[]`\n\nFollow-up action:\n- If a default email exists in ChatGPT/MCP endpoints, move it to `DEFAULT_CHATGPT_USER_EMAIL` env var.\n
### Rules coverage gaps
The generator compares Firestore `.collection('...')` usage to `firestore.rules` match blocks and reports potential gaps as “Top Risks”.\n\nAssumption: this is best-effort and may flag false positives (e.g. collections used only by server-side Admin code).\n
### Index coverage gaps
The generator includes best-effort checks for known patterns (e.g. `external_knowledge` cache lookup). Treat reported gaps as “needs verification”, not automatic proof of runtime failure.\n
## PII risks
Potential PII surfaces:\n- chat history content (`history.content`)\n- memories (`memories.content`)\n- knowledge uploads (chunked into `history` or `memories` depending on implementation)\n- external web results cached in `external_knowledge`\n\nRecommendations:\n- Ensure logs never print raw content or embeddings.\n- Avoid storing raw API responses from external sources without redaction.\n
## Logging and redaction
Repo uses structured logging patterns in analytics/performance tracking modules.\n- `src/lib/analytics.ts`\n- `src/lib/performance-tracker.ts`\n\nAssumption: Cloud Logging / BigQuery sinks are configured per runbooks (see `DEPLOYMENT_RUNBOOK_V2.md`).\n
## Where in code
- **Auth guard**: `src/components/auth/auth-guard.tsx`\n- **Admin auth**: `src/lib/firebase-admin.ts`\n- **Rules**: `firestore.rules`, `storage.rules`\n- **ChatGPT Actions endpoints**: `src/app/api/chatgpt/*/route.ts`\n- **MCP bridge**: `src/app/api/mcp/*/route.ts`\n- **Export**: `src/app/actions/user.ts`\n- **Status risk detection**: `scripts/generate-status.ts`


