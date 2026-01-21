# Deep Research Task Packet

> **Objective:** Raise test coverage to 80%+ and complete UI/UX polish to match "Digital Void" design system spec  
> **Scope:** Tests module (70% → 80%+), UI/UX module (42% → 100%)  
> **Date:** 2026-01-14

---

## SCOPE (IN)

- Unit tests for memory search edge cases, LLM provider error handling, cron job idempotency
- Integration tests for file upload pipeline, security rules validation, external API endpoints
- E2E tests for voice/image flows, artifact copy/download, knowledge base upload error handling (if Playwright installed)
- Design system token audit (colors, typography, spacing) against research Section 3 spec
- Settings page UI completion (API key display, export button, clear memory confirmation)
- Firestore rules gap fixes (`learning_queue` collection)
- Hardcoded credentials/URLs replacement with env vars

## SCOPE (OUT)

- Phase 7/9/11/13/14 implementation (not critical path for current gaps)
- Major architecture changes (research blueprint, codebase already built)
- New feature development (focus on completion, not expansion)
- Playwright E2E setup (only if already installed, otherwise skip)

## ASSUMPTIONS

- Current codebase structure is stable (`src/app`, `src/lib`, `src/components`, `src/ai` patterns)
- Firebase emulator available for integration tests (or mocks acceptable)
- Jest test infrastructure exists (`jest.config.cjs`, `jest.setup.js`)
- Design system uses Tailwind + Shadcn/UI (research Section 3)
- LLM provider interface exists (Gemini via Genkit, abstraction in `src/ai/`)

## ARCHITECTURE NOTES

- **Modules:** `src/lib/` (memory search, context manager), `src/app/api/` (endpoints), `src/components/` (UI), `src/ai/` (flows, agents)
- **Data:** Firestore collections (`memories`, `threads`, `history`, `artifacts`, `settings`, `system_*`, `learning_queue`)
- **Endpoints:** Next.js API routes (`POST /api/chat/message`, `GET /api/memory/search`, `POST /api/cron/*`)
- **Testing:** Jest (unit), Firebase Emulator or mocks (integration), Playwright (E2E - optional)
- **Design:** Tailwind config (`tailwind.config.ts`), Shadcn components (`src/components/ui/`)

---

## FILES TO CREATE / EDIT

### Test Files (NEW)
- `src/__tests__/lib/memory-search-edge.test.ts` — memory search edge cases (empty query, large result set, embedding errors)
- `src/__tests__/lib/llm-provider-error.test.ts` — LLM provider error handling (timeout, quota, invalid response)
- `src/__tests__/api/cron-cleanup.test.ts` — cron cleanup integration test
- `src/__tests__/api/cron-context-decay.test.ts` — cron context-decay integration test
- `src/__tests__/api/cron-daily-briefing.test.ts` — cron daily-briefing integration test
- `src/__tests__/api/cron-meta-learning.test.ts` — cron meta-learning integration test
- `src/__tests__/api/cron-nightly-reflection.test.ts` — cron nightly-reflection integration test
- `src/__tests__/api/cron-reindex-memories.test.ts` — cron reindex-memories integration test

### Test Files (FIX/ENHANCE)
- `tests/lib/hybrid-search.test.ts` — fix fetch shim, convert to Jest syntax, add edge cases
- `src/lib/__tests__/memory-utils.test.ts` — enhance with edge cases (empty content, missing userId, large batches)
- `jest.setup.js` — add fetch shim for OpenAI SDK if missing

### UI Components (NEW)
- `src/components/settings/APIKeyManager.tsx` — API key display, generate/revoke UI
- `src/components/settings/ExportButton.tsx` — export data button with download trigger
- `src/components/settings/ClearMemoryButton.tsx` — clear memory with confirmation dialog

### UI Files (ENHANCE)
- `src/app/(pandora-ui)/settings/page.tsx` — integrate new Settings components
- `tailwind.config.ts` — audit/add missing tokens (Digital Void colors, typography scale, spacing)

### Config Files (FIX)
- `firestore.rules` — add `learning_queue` rules stanza (or document exclusion)

### Config Files (REPLACE HARDCODED VALUES)
- `public/openapi-mcp.json` — replace `user@example.com` with `DEFAULT_CHATGPT_USER_EMAIL` env var
- `public/openapi-mcp.yaml` — replace `user@example.com` with `DEFAULT_CHATGPT_USER_EMAIL` env var
- `src/app/api/chatgpt/hybrid-retrieve/route.ts` — replace `joven.ong23@gmail.com` with env var
- `src/app/api/chatgpt/openapi.yaml` — replace hardcoded URLs with `NEXT_PUBLIC_API_BASE_URL` env var

---

## IMPLEMENTATION STEPS (NUMBERED)

### Phase 1: Fix Test Infrastructure
1. **Fix hybrid-search test:** Add fetch shim to `jest.setup.js`, convert `tests/lib/hybrid-search.test.ts` to Jest syntax, run `npm test -- tests/lib/hybrid-search.test.ts` → expect pass
2. **Enhance memory-utils test:** Add edge cases to `src/lib/__tests__/memory-utils.test.ts` (empty content, missing userId, large batches, embedding failures), run `npm test -- src/lib/__tests__/memory-utils.test.ts` → expect >85% coverage

### Phase 2: Write New Unit Tests
3. **Memory search edge cases:** Create `src/__tests__/lib/memory-search-edge.test.ts` with tests for: empty query returns [], large memory set (>1000) handled efficiently, embedding generation failures caught, run `npm test -- src/__tests__/lib/memory-search-edge.test.ts` → expect all pass
4. **LLM provider error handling:** Locate LLM provider abstraction (likely `src/ai/` or `src/lib/`), create `src/__tests__/lib/llm-provider-error.test.ts` with tests for: timeout retries 3x, quota exceeded fallback, invalid JSON response parsing, run `npm test -- src/__tests__/lib/llm-provider-error.test.ts` → expect all pass

### Phase 3: Write Cron Integration Tests
5. **Cron cleanup test:** Create `src/__tests__/api/cron-cleanup.test.ts` with tests for: auth required (401/403), happy path (200), idempotency, error handling, run `npm test -- src/__tests__/api/cron-cleanup.test.ts` → expect >80% coverage
6. **Cron context-decay test:** Create `src/__tests__/api/cron-context-decay.test.ts` (same pattern as step 5)
7. **Cron daily-briefing test:** Create `src/__tests__/api/cron-daily-briefing.test.ts` (same pattern as step 5)
8. **Cron meta-learning test:** Create `src/__tests__/api/cron-meta-learning.test.ts` (same pattern as step 5)
9. **Cron nightly-reflection test:** Create `src/__tests__/api/cron-nightly-reflection.test.ts` (same pattern as step 5)
10. **Cron reindex-memories test:** Create `src/__tests__/api/cron-reindex-memories.test.ts` (same pattern as step 5)

### Phase 4: Design System Audit
11. **Audit Tailwind config:** Compare `tailwind.config.ts` tokens to research Section 3 spec (colors: `bg-main #0B0B0D`, `text-primary #EDEDED`, `accent #7F5AF0`; typography: Inter/SF Pro, 16px base; spacing: 4px baseline), add missing tokens, run `npm run dev` → visual verification

### Phase 5: Settings Page UI
12. **Create APIKeyManager component:** Create `src/components/settings/APIKeyManager.tsx` with: show masked key, generate button, revoke button, run `npm run dev` → navigate to `/settings`, verify display
13. **Create ExportButton component:** Create `src/components/settings/ExportButton.tsx` with: download JSON trigger, run `npm run dev` → click export, verify download
14. **Create ClearMemoryButton component:** Create `src/components/settings/ClearMemoryButton.tsx` with: confirmation dialog, run `npm run dev` → click clear memory, verify confirmation
15. **Integrate Settings components:** Update `src/app/(pandora-ui)/settings/page.tsx` to import and render new components, run `npm run dev` → full Settings page verification

### Phase 6: Firestore Rules Fix
16. **Add learning_queue rules:** Edit `firestore.rules`, add `match /learning_queue/{docId} { allow read, write: if request.auth.uid != null; }` OR document exclusion in comments, run `firebase deploy --only firestore:rules --project <project-id>` → expect no errors

### Phase 7: Replace Hardcoded Values
17. **Replace OpenAPI emails:** Edit `public/openapi-mcp.json` and `public/openapi-mcp.yaml`, replace `user@example.com` with `process.env.DEFAULT_CHATGPT_USER_EMAIL || 'user@example.com'` (or template var), run `npm run build` → verify no hardcoded emails
18. **Replace route email:** Edit `src/app/api/chatgpt/hybrid-retrieve/route.ts`, replace `joven.ong23@gmail.com` with env var, run `npm run build` → verify
19. **Replace OpenAPI URLs:** Edit `src/app/api/chatgpt/openapi.yaml`, replace hardcoded URLs with `NEXT_PUBLIC_API_BASE_URL` env var, run `npm run build` → verify

### Phase 8: Final Verification
20. **Run full test suite:** Run `npm test -- --coverage` → expect overall coverage >80%, all tests pass
21. **Run integration tests:** Run `npm run test:integration` (if exists) → expect all pass
22. **Run E2E tests:** Run `npm run test:e2e` (if Playwright installed) → expect all pass
23. **Visual audit:** Run `npm run dev`, navigate through Settings page, verify all components render correctly

---

## API / SCHEMA

### Endpoints (Existing - Verify Tests)
- `GET /api/memory/search?q=<query>` — Request: Query param `q` (URL-encoded string), Response JSON: `{ results: [{ memoryId, content, relevanceScore, sourceThreadId?, timestamp? }] }`
- `POST /api/knowledge/upload` — Request: Multipart form-data (`file: binary`), Response JSON: `{ success: true, chunksStored: number } | { error: "Unsupported file type" }`
- `GET /api/settings/export` — Request: None (auth required), Response: File download (`application/json`) with user data
- `POST /api/cron/*` — Request: Auth header required, Response JSON: `{ success: boolean, ... }`

### Collections / Tables
- `learning_queue` (if exists): `userId`, `taskId`, `status`, `createdAt` — **ADD Firestore rules** (step 16)
- `memories`: `userId` (indexed), `content`, `embedding` (array<number>), `createdAt` (indexed)
- `settings`: `userId` (doc ID), `activeModel`, `apiKeyHash`, `theme`, `notifications`

---

## ACCEPTANCE TESTS (MUST PASS)

### Unit Tests
- [ ] Memory search empty query returns `[]` — `src/__tests__/lib/memory-search-edge.test.ts` passes
- [ ] Memory search with 1000+ memories completes in <3s — integration test passes (or mocked)
- [ ] LLM provider timeout retries 3x then returns error — `src/__tests__/lib/llm-provider-error.test.ts` passes
- [ ] Memory utils rejects empty content — `src/lib/__tests__/memory-utils.test.ts` passes
- [ ] Memory utils rejects missing userId — `src/lib/__tests__/memory-utils.test.ts` passes
- [ ] Hybrid search handles embedding failures gracefully — `tests/lib/hybrid-search.test.ts` passes

### Integration Tests
- [ ] Knowledge upload PDF creates chunks in Firestore — integration test passes (or mocked)
- [ ] Security rules deny user A accessing user B's memories — integration test passes
- [ ] Cron cleanup requires auth (401/403) — `src/__tests__/api/cron-cleanup.test.ts` passes
- [ ] Cron cleanup happy path (200) — `src/__tests__/api/cron-cleanup.test.ts` passes
- [ ] Cron cleanup idempotent — `src/__tests__/api/cron-cleanup.test.ts` passes
- [ ] All 6 cron routes have tests — all `src/__tests__/api/cron-*.test.ts` files exist and pass

### UI Tests (Manual/E2E)
- [ ] Settings page shows API key (masked) — visual verification or E2E test passes
- [ ] Export button downloads JSON — E2E test passes (or manual verification)
- [ ] Clear memory shows confirmation — E2E test passes (or manual verification)
- [ ] Tailwind theme tokens match Digital Void spec (colors, fonts, spacing) — manual audit passes

### Deployment Tests
- [ ] Firestore rules deploy without errors — `firebase deploy --only firestore:rules` succeeds
- [ ] Firestore rules cover all collections (no missing rules errors) — deploy validation passes
- [ ] No hardcoded emails/URLs in build — `npm run build` succeeds, grep verification passes

### Coverage Targets
- [ ] Overall test coverage >80% — `npm test -- --coverage` shows >80%
- [ ] `src/lib/hybrid-search.ts` coverage >85% — coverage report shows >85%
- [ ] `src/lib/memory-utils.ts` coverage >85% — coverage report shows >85%
- [ ] All cron routes coverage >80% — coverage report shows >80% for each route

---

## RUNBOOK (HOW TO VERIFY)

### Local Development
1. **Install dependencies:** `npm install`
2. **Run unit tests:** `npm test` → expect 80%+ coverage, all tests pass
3. **Run integration tests:** `npm run test:integration` (if exists) → expect all pass
4. **Run E2E tests:** `npm run test:e2e` (if Playwright installed) → expect all pass
5. **Start dev server:** `npm run dev` → navigate to `http://localhost:9002/settings`, verify UI
6. **Audit design tokens:** `cat tailwind.config.ts | grep -A 30 "colors:"` → compare to research Section 3 spec

### Deployment
1. **Validate Firestore rules:** `firebase deploy --only firestore:rules --project <project-id>` → expect no errors
2. **Build:** `npm run build` → expect success, verify no hardcoded values (grep)
3. **Deploy:** `firebase deploy --only hosting --project <project-id>` → expect success

### CI/CD
1. **Run tests:** `npm test -- --coverage` → expect >80% coverage, all pass
2. **Run lint:** `npm run lint` → expect no errors
3. **Run typecheck:** `npm run typecheck` → expect no errors
4. **Build:** `npm run build` → expect success

---

## ROLLBACK PLAN

### If Test Failures Block Deployment
- **Action:** Disable failing tests temporarily (mark as `.skip`), deploy, fix in follow-up PR
- **Files:** Test files with `.skip` markers
- **Verification:** Re-enable tests, fix, redeploy

### If Settings UI Breaks
- **Action:** Revert Settings page component to previous version, keep backend changes
- **Files:** `src/app/(pandora-ui)/settings/page.tsx` (revert), keep new components for later
- **Verification:** Settings page loads, new components can be integrated incrementally

### If Firestore Rules Break Access
- **Action:** Rollback rules deploy via Firebase console (previous version), fix rules, redeploy
- **Files:** `firestore.rules` (revert to previous commit)
- **Verification:** Access restored, rules fixed, redeploy succeeds

### If Tailwind Tokens Break Styling
- **Action:** Revert `tailwind.config.ts`, audit incrementally
- **Files:** `tailwind.config.ts` (revert to previous commit)
- **Verification:** Styling restored, tokens can be added incrementally

---

## NOTES

- **Test Infrastructure:** Ensure `jest.setup.js` has fetch shim for OpenAI SDK before writing new tests
- **LLM Provider Location:** May need to search codebase for LLM provider abstraction (`src/ai/` or `src/lib/`)
- **Playwright E2E:** Only add if already installed, otherwise skip E2E tests for now
- **Env Vars:** Document required env vars in `.env.example` or README (e.g., `DEFAULT_CHATGPT_USER_EMAIL`, `NEXT_PUBLIC_API_BASE_URL`)
