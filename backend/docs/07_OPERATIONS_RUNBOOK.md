# Operations Runbook — Deploy, Monitor, Troubleshoot

## Purpose
Provide a practical runbook: deploy steps, incident response basics, monitoring hooks, common failure modes, and rollback.

## Deployment model (repo-derived)
This repo is configured for Firebase + App Hosting:
- `firebase.json` (hosting and deployment wiring)
- `apphosting.yaml` (App Hosting runtime + env var configuration)
- Runbooks: `DEPLOYMENT_RUNBOOK.md`, `DEPLOYMENT_RUNBOOK_V2.md`

Assumption: scheduled cron endpoints are triggered by Cloud Scheduler or an equivalent external scheduler hitting the Next.js API routes.

## Pre-deploy checklist (minimum)
- Validate required env vars are set in App Hosting secrets (do not commit).\n- Ensure Firestore indexes are deployed (`firestore.indexes.json`).\n- Ensure rules are deployed (`firestore.rules`, `storage.rules`).\n- Verify OpenAI/Tavily keys are configured if those features are enabled.\n
## Deploy
Use the repo’s deployment scripts as source of truth:\n- `npm run deploy` (if present)\n- Firebase CLI / App Hosting steps documented in `DEPLOYMENT_RUNBOOK_V2.md`\n
## Post-deploy verification
- Hit `/` and confirm UI loads and auth works.\n- Create a thread and send a message.\n- Confirm `history` and `threads` documents are written.\n- Confirm embeddings are present on new messages if embeddings are enabled.\n- Verify cron endpoints are protected (CRON_SECRET enforced where configured).\n- Verify MCP OpenAPI endpoint returns schema: `/api/mcp/openapi`.\n
## Monitoring
Repo references:\n- Sentry configs: `sentry.client.config.ts`, `sentry.server.config.ts`, `sentry.edge.config.ts`\n- Analytics/performance tracking: `src/lib/analytics.ts`, `src/lib/performance-tracker.ts`\n\nAssumption: BigQuery log sinks / Cloud Logging exports are configured per `DEPLOYMENT_RUNBOOK_V2.md`.\n
## Common failure modes
### Firestore missing index (“failed-precondition”)
- Symptom: UI shows “requires an index”.\n- Where surfaced: `src/hooks/use-chat-history.ts`.\n- Fix: deploy `firestore.indexes.json` and wait for index build.\n
### Embeddings/search failures
- Symptom: long-term memory retrieval empty or errors in lanes.\n- Root causes: missing `OPENAI_API_KEY`, quota/rate limits, transient network.\n- Fix: validate env vars; inspect Cloud logs; re-run `/api/cron/reindex-memories`.\n
### Cron endpoints not running
- Symptom: decay/research/reflection doesn’t happen.\n- Root causes: scheduler not configured, CRON_SECRET mismatch.\n- Fix: validate scheduler configuration; validate `CRON_SECRET` in headers.\n
### MCP integration failures
- Symptom: ChatGPT Actions can’t call tools.\n- Root causes: missing `MCP_API_KEY`/`CHATGPT_API_KEY`, schema mismatch.\n- Fix: verify OpenAPI served via `/api/mcp/openapi`; verify bearer tokens.\n
## Rollback
Follow the rollback guidance in `DEPLOYMENT_RUNBOOK*.md`.\n\nAssumption: App Hosting/Cloud Run revision rollback is available in the deployed environment.\n
## Where in code
- Hosting config: `firebase.json`, `apphosting.yaml`\n- Cron routes: `src/app/api/cron/*/route.ts`\n- MCP routes: `src/app/api/mcp/*/route.ts`\n- Sentry: `sentry.*.config.ts`\n- Index error UX: `src/hooks/use-chat-history.ts`\n


