=== 2) CURSOR TASK PACKET ===

OBJECTIVE
Complete test coverage to 80%+ and finish UI/UX polish to match "Digital Void" design system spec, addressing the two largest module gaps (Tests 70%, UI/UX 42%).

SCOPE (IN)
- Unit tests for memory search edge cases, LLM provider error handling, cron job idempotency
- Integration tests for file upload pipeline, security rules validation, external API endpoints
- E2E tests for voice/image flows, artifact copy/download, knowledge base upload error handling
- Design system token audit (colors, typography, spacing) against research Section 3 spec
- Settings page UI completion (API key display, export button, clear memory confirmation)
- Firestore rules gap fixes (learning_queue collection)

SCOPE (OUT)
- Phase 7/9/11/13/14 implementation (not critical path for current gaps)
- Major architecture changes (research blueprint, codebase already built)
- New feature development (focus on completion, not expansion)

ASSUMPTIONS
- Current codebase structure is stable (src/app, src/lib, src/components, src/ai patterns)
- Firebase emulator available for integration tests
- Playwright installed for E2E tests
- Design system uses Tailwind + Shadcn/UI (research Section 3)
- LLM provider interface exists (research Section 4, LLMProvider abstraction)

ARCHITECTURE NOTES
- Modules: src/lib/ (memory search, context manager), src/app/api/ (endpoints), src/components/ (UI), src/ai/ (flows, agents)
- Data: Firestore collections (memories, threads, history, artifacts, settings, system_*)
- Endpoints: Next.js API routes (POST /api/chat/message, GET /api/memory/search, etc.)
- Testing: Jest (unit), Firebase Emulator (integration), Playwright (E2E)
- Design: Tailwind config (theme tokens), Shadcn components (Button, Input, Modal, etc.)

FILES TO CREATE / EDIT (EXPECTED)
- src/__tests__/lib/memory-search-edge.test.ts — memory search edge cases (empty query, large result set, embedding errors)
- src/__tests__/lib/llm-provider-error.test.ts — LLM provider error handling (timeout, quota, invalid response)
- src/__tests__/api/knowledge-upload.test.ts — file upload integration (PDF parsing, chunking, embedding)
- src/__tests__/api/security-rules.test.ts — Firestore rules validation (unauthorized access attempts)
- tests/e2e/voice-image-flows.spec.ts — Playwright E2E for voice recording, image upload, artifact download
- tailwind.config.ts — audit/add missing tokens (Digital Void colors, typography scale, spacing)
- src/components/ui/settings/APIKeyManager.tsx — API key display, generate/revoke UI
- src/components/ui/settings/ExportButton.tsx — export data button with download trigger
- src/components/ui/settings/ClearMemoryButton.tsx — clear memory with confirmation dialog
- firestore.rules — add learning_queue rules stanza (or document exclusion)

IMPLEMENTATION STEPS (NO FLUFF)
1) Audit test coverage gaps: run `npm test -- --coverage`, identify modules <80%, prioritize memory search, LLM provider, cron jobs
2) Write unit tests for memory search edge cases: empty query returns empty array, large memory set (>1000) handled efficiently, embedding generation failures caught
3) Write unit tests for LLM provider error handling: timeout retries, quota exceeded fallback, invalid JSON response parsing
4) Write integration test for knowledge upload: POST /api/knowledge/upload with PDF file, verify chunks created in Firestore, embeddings generated
5) Write integration test for security rules: attempt read/write as user A to user B's data, verify 403/denied
6) Write E2E test for voice flow: record audio via Playwright, submit to /api/chat/transcribe, verify response streamed
7) Write E2E test for image upload: attach image file, submit message, verify image stored, assistant response includes image reference
8) Write E2E test for artifact download: trigger code block generation, verify artifact created, click download, verify file content
9) Audit Tailwind config: compare tailwind.config.ts tokens to research Section 3 (colors: bg-main #0B0B0D, text-primary #EDEDED, accent #7F5AF0; typography: Inter/SF Pro, 16px base; spacing: 4px baseline)
10) Complete Settings page UI: implement APIKeyManager component (show masked key, generate button), ExportButton (download JSON), ClearMemoryButton (confirm dialog)
11) Fix Firestore rules: add match /learning_queue/{docId} { allow read, write: if request.auth.uid != null; } or document why excluded
12) Update test scripts: ensure `npm test` runs unit+integration, `npm run test:e2e` runs Playwright, CI runs both

API / SCHEMA (IF ANY)
- Endpoint: GET /api/memory/search?q=<query>
  Request: Query param q (URL-encoded string)
  Response JSON: { results: [{ memoryId, content, relevanceScore, sourceThreadId?, timestamp? }] }
- Endpoint: POST /api/knowledge/upload
  Request: Multipart form-data (file: binary)
  Response JSON: { success: true, chunksStored: number } | { error: "Unsupported file type" }
- Endpoint: GET /api/settings/export
  Request: None (auth required)
  Response: File download (application/json) with user data
- Collections / tables:
  - learning_queue (if exists): userId, taskId, status, createdAt — add Firestore rules
  - memories: userId (indexed), content, embedding (array<number>), createdAt (indexed)
  - settings: userId (doc ID), activeModel, apiKeyHash, theme, notifications

ACCEPTANCE TESTS (MUST PASS)
- [ ] Memory search empty query returns [] — unit test passes
- [ ] Memory search with 1000+ memories completes in <3s — integration test passes
- [ ] LLM provider timeout retries 3x then returns error — unit test passes
- [ ] Knowledge upload PDF creates chunks in Firestore — integration test passes
- [ ] Security rules deny user A accessing user B's memories — integration test passes
- [ ] Voice message transcribes and streams response — E2E test passes
- [ ] Image upload stores file and assistant responds — E2E test passes
- [ ] Artifact download produces correct file content — E2E test passes
- [ ] Tailwind theme tokens match Digital Void spec (colors, fonts, spacing) — manual audit passes
- [ ] Settings page shows API key (masked), export button works, clear memory confirms — E2E test passes
- [ ] Firestore rules cover all collections (no missing rules errors) — deploy validation passes

RUNBOOK (HOW TO VERIFY)
- Run unit tests: `npm test` — expect 80%+ coverage, all tests pass
- Run integration tests: `npm run test:integration` (or with emulator) — expect all API tests pass
- Run E2E tests: `npm run test:e2e` — expect Playwright tests pass (voice, image, artifact flows)
- Audit design tokens: `cat tailwind.config.ts | grep -A 20 "colors:"` — compare to research Section 3 spec
- Test Settings page: start dev server, navigate to /settings, verify API key display, click export, verify download, click clear memory, verify confirmation
- Validate Firestore rules: `firebase deploy --only firestore:rules` — expect no errors, test with emulator security rules test

ROLLBACK PLAN
- If test failures block deployment: disable failing tests temporarily (mark as `.skip`), deploy, fix in follow-up PR
- If Settings UI breaks: revert Settings page component to previous version, keep backend changes
- If Firestore rules break access: rollback rules deploy via Firebase console (previous version), fix rules, redeploy
- If Tailwind tokens break styling: revert tailwind.config.ts, audit incrementally

