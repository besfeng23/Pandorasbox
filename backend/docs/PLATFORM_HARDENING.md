# Platform Hardening and Unification (April 2026)

## Canonical auth model

All API routes now use shared auth guards in `src/server/api-auth.ts`:

- `requireUser(request)` for authenticated user routes.
- `requireAdmin(request)` for admin-only routes.
- `requireCron(request)` for scheduled job routes (`Authorization: Bearer $CRON_SECRET`).

No route should accept `userId` from body/query for authorization decisions.

## Canonical conversation model

The canonical chat schema is now:

- `users/{uid}/conversations/{conversationId}`
- `users/{uid}/conversations/{conversationId}/messages/{messageId}`

`/api/chat`, `/api/conversations/*`, and compatibility `/api/threads/*` routes use this model.

## Chat API contract

`POST /api/chat`

```json
{
  "message": "hello",
  "conversationId": "optional",
  "agentId": "builder|universe",
  "workspaceId": "optional"
}
```

- User identity is derived from verified Firebase ID token.
- Response is streamed SSE and returns `X-Conversation-Id` header.
- User and assistant messages are persisted under the canonical conversation path.

## Security hardening highlights

- CORS now resolves to same-origin or explicit allowlist (`CORS_ALLOWED_ORIGINS`).
- Cron routes require `CRON_SECRET` and do not permit GET-based manual invocation.
- Health routes return minimal status (`ok`/`degraded`) and avoid infra detail leakage.
- Middleware now excludes `/api/*` and only protects intended page routes.

## New/updated environment variables

- `CRON_SECRET` (required for `/api/cron/*`).
- `CORS_ALLOWED_ORIGINS` (comma-separated; optional but strongly recommended).
- Existing LLM/Qdrant env vars are unchanged.

## Verification

Run locally from `backend/`:

- `npm run lint`
- `npm run typecheck`
- `npm run test`
- `npm run build`
