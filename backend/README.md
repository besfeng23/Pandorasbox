# Pandora's Box (Release Candidate)

Pandora's Box is a Next.js 15 + React 19 + Firebase application with authenticated chat, canonical conversation/message persistence, memory ingestion/search, and protected admin + cron operations.

## Architecture summary

- **Frontend/App Router**: `src/app/**` pages and API routes.
- **Auth & guards**: centralized in `src/server/api-auth.ts`.
- **Canonical chat data model**:
  - `users/{uid}/conversations/{conversationId}`
  - `users/{uid}/conversations/{conversationId}/messages/{messageId}`
- **Repositories**: conversation and message persistence in `src/server/repositories/conversations.ts`.
- **Memory pipeline**: ingestion/search flows under `src/lib/memory*`, `src/app/api/ingest/*`, `src/app/api/memories/*`.
- **Operational routes**:
  - Admin: `src/app/api/admin/*`
  - Cron: `src/app/api/cron/*`

See `ARCHITECTURE.md` and `docs/PLATFORM_HARDENING.md` for deeper design notes.

## Auth model

- `requireUser(request)`: required for authenticated user APIs.
- `requireAdmin(request)`: requires an authenticated user with admin claims.
- `requireCron(request)`: requires `Authorization: Bearer $CRON_SECRET`.
- API authorization decisions **must not** trust `userId` from body/query params.

## Critical environment variables

Minimum production configuration:

- `CRON_SECRET` — required for all `/api/cron/*` routes.
- `CORS_ALLOWED_ORIGINS` — comma-separated origin allowlist for cross-origin API access.
- `NEXT_PUBLIC_API_URL` — canonical app URL (also used for CORS fallback behavior).
- `FIREBASE_SERVICE_ACCOUNT_KEY` (or ADC/service account JSON) — server-side Firebase auth + Firestore access.
- LLM/vector settings (deployment-dependent), for example:
  - `INFERENCE_URL`
  - `INFERENCE_MODEL`
  - `EMBEDDINGS_BASE_URL`
  - `QDRANT_URL`

Reference defaults: repository root `.env.example`.

## Local setup

From repository root:

```bash
npm install
cd backend
pnpm install
```

Run development server:

```bash
cd backend
pnpm dev
```

## Validation commands (release gate)

Run from `backend/`:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

## Deployment notes

- Build output uses Next.js standalone mode plus `scripts/post-build-fix.js` for Firebase App Hosting route manifest placement.
- Ensure Firebase admin credentials are present in deployed runtime.
- Configure cron scheduler to send `Authorization: Bearer $CRON_SECRET`.

## Admin and cron security setup

- Admin APIs require Firebase custom claims (`admin: true` or role equivalent) enforced in `requireAdmin`.
- Cron APIs are protected by `requireCron`; never expose cron secrets client-side.

## Release checklist

Use `docs/RELEASE_CHECKLIST.md` for the full pre-release and smoke-test checklist.

## Known limitations

- ESLint currently reports a large number of legacy warnings (primarily `any` usage and unused symbols) outside core release-critical paths. Current release gate is **zero lint errors**, not zero warnings.
