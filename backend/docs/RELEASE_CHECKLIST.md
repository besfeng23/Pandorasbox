# Release Checklist (RC)

Use this checklist before promoting a build to production.

## 1) Environment verification

- [ ] `NEXT_PUBLIC_API_URL` is set to the production URL.
- [ ] `CORS_ALLOWED_ORIGINS` includes all allowed app origins.
- [ ] `CRON_SECRET` is set and rotated if needed.
- [ ] Firebase admin credentials are configured (`FIREBASE_SERVICE_ACCOUNT_KEY` or ADC).
- [ ] Inference/vector env vars are present (`INFERENCE_URL`, `EMBEDDINGS_BASE_URL`, `QDRANT_URL`, etc.).

## 2) Auth/admin verification

- [ ] Login succeeds for a normal user.
- [ ] Protected pages redirect unauthenticated users to `/login`.
- [ ] Admin user can access `/api/admin/stats`.
- [ ] Non-admin user receives `403` for `/api/admin/stats`.

## 3) Cron protection verification

- [ ] `/api/cron/*` returns `401` without bearer secret.
- [ ] `/api/cron/*` returns success with valid `Authorization: Bearer $CRON_SECRET`.

## 4) Build + quality gate

Run from `backend/`:

- [ ] `pnpm lint` (no errors; warnings reviewed)
- [ ] `pnpm typecheck`
- [ ] `pnpm test`
- [ ] `pnpm build`

## 5) Smoke-test pages

- [ ] `/` dashboard loads for authenticated user.
- [ ] `/chat` and `/chat/[id]` load and render conversation history.
- [ ] `/memory` CRUD interactions work.
- [ ] `/settings/profile` loads and saves.
- [ ] `/connectors` upload/web ingestion flows complete.

## 6) Smoke-test API flows

- [ ] `POST /api/chat` streams response and returns `X-Conversation-Id`.
- [ ] `GET/POST /api/conversations` behave correctly.
- [ ] `GET/PATCH/DELETE /api/conversations/[id]` behave correctly.
- [ ] Compatibility routes `/api/threads/*` match canonical conversation behavior.
- [ ] `/api/memories` and `/api/memories/[id]` work for authorized users.

## 7) Observability/logging spot checks

- [ ] Unauthorized requests log minimal/no sensitive payload details.
- [ ] Unexpected server errors are logged with route context.
- [ ] No secret values are printed in logs.

## 8) Rollback awareness

- [ ] Previous stable image/tag is known.
- [ ] Rollback command/path is documented in deployment runbook.
- [ ] Firestore schema changes (if any) are backward-compatible or reversible.
