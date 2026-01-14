# Deep Research Execution Digest

> **Generated:** 2026-01-14  
> **Source:** `docs/DEEP_RESEARCH_RAW.md` (paste raw research there)  
> **Purpose:** Extract actionable specs from Deep Research and map to current codebase reality

---

## WHERE WE ARE NOW

### Codebase Status (per `docs/STATUS.md`)
- **Overall Completion:** 93%
- **Core Infrastructure:** ✅ Deployed (Firebase Auth/Firestore/Hosting, Next.js 15 App Router, Gemini LLM via Vertex AI)
- **Modules Complete (100%):** Agents+Cron, Artifacts, Context Layer, Frontend System, Hybrid Search, Knowledge Graph+Analytics, Knowledge Upload, MCP+Integrations, Memory+Embeddings, Meta-learning+Feedback, Security+Ops
- **Modules In Progress:**
  - **Tests:** 70% → target 80%+ (edge cases, E2E gaps)
  - **UI/UX — Digital Void Shell:** 42% → target 100% (design tokens, Settings page components)

### Phases Status
- **Done (100%):** Phases 1, 2, 4, 5, 8
- **In Progress (50-89%):** Phases 3 (89%), 6 (89%), 10 (50%), 12 (89%), 15 (89%)
- **Planned (0%):** Phases 7, 9, 11, 13, 14

### Architecture Reality
- **Stack:** Next.js 15 App Router + Firebase (Hosting, Functions, Firestore, Auth) + Vertex AI (Gemini)
- **LLM Provider:** Gemini (branded as "Pandora" in UI) via Genkit 1.27.0
- **Data Model:** Firestore collections (`threads`, `history`, `memories`, `artifacts`, `settings`, `system_*`, `external_knowledge`, `feedback`, `performance_metrics`, `meta_learning_state`, `learning_queue`)
- **Testing:** Jest (unit), Firebase Emulator (integration), Playwright (E2E - if added)
- **Design System:** Tailwind + Shadcn/UI, "Digital Void" theme (colors: `void`, `brand-cyan`, `brand-violet`; fonts: Inter)

### Evidence Files
- `docs/STATUS.md` - Current completion percentages
- `docs/09_ROADMAP_AND_STATUS.md` - Phase details
- `src/lib/kairosClient.ts` - Kairos event emission
- `tailwind.config.ts` - Design tokens (needs audit vs research Section 3)
- `firestore.rules` - Security rules (missing `learning_queue` collection)

---

## WHAT'S MISSING (RANKED BY PRIORITY)

### 1. Test Coverage Gaps (HIGH - Tests module 70% → 80%+)
**Evidence:** `docs/DR_STEP1_COVERAGE_AUDIT.md`, `docs/DR_STEP3_COVERAGE_STATUS.md`

**Missing Tests:**
- `src/lib/hybrid-search.ts` - **0% coverage** (test file exists but fails due to missing fetch shim)
- `src/lib/memory-utils.ts` - **0% coverage** (test file exists: `src/lib/__tests__/memory-utils.test.ts` but needs edge cases)
- `src/lib/vector.ts` - **0% coverage** (no test file)
- `src/lib/context-manager.ts` - **0% coverage** (no test file)
- `src/lib/external-cache.ts` - **0% coverage** (test exists but fails)
- Cron routes (all 0%):
  - `src/app/api/cron/cleanup/route.ts`
  - `src/app/api/cron/context-decay/route.ts`
  - `src/app/api/cron/daily-briefing/route.ts`
  - `src/app/api/cron/meta-learning/route.ts`
  - `src/app/api/cron/nightly-reflection/route.ts`
  - `src/app/api/cron/reindex-memories/route.ts`

**Edge Cases Not Covered:**
- Memory search: empty query, large result sets (>1000), embedding generation failures
- LLM provider: timeout retries, quota exceeded fallback, invalid JSON response parsing
- Cron jobs: idempotency, error handling, auth gating

**Files to Create/Edit:**
- `src/__tests__/lib/memory-search-edge.test.ts` (NEW)
- `src/__tests__/lib/llm-provider-error.test.ts` (NEW - need to locate LLM provider abstraction)
- `src/__tests__/api/cron-*.test.ts` (NEW - 6 files)
- `tests/lib/hybrid-search.test.ts` (FIX - add fetch shim, convert to Jest)
- `src/lib/__tests__/memory-utils.test.ts` (ENHANCE - add edge cases)

### 2. UI/UX Design System Gaps (HIGH - UI/UX module 42% → 100%)
**Evidence:** `tailwind.config.ts` (current tokens), research Section 3 (expected spec)

**Missing Design Tokens:**
- Colors: Research expects `bg-main #0B0B0D`, `text-primary #EDEDED`, `accent #7F5AF0`
- Current: `void: '#0B0C0F'`, `brand-cyan: '#00E5FF'`, `brand-violet: '#7C3AED'` (close but needs audit)
- Typography: Research expects Inter/SF Pro, 16px base (current: Inter, needs spacing scale verification)
- Spacing: Research expects 4px baseline (needs audit)

**Missing Settings Page Components:**
- `src/components/settings/APIKeyManager.tsx` (NEW - show masked key, generate/revoke)
- `src/components/settings/ExportButton.tsx` (NEW - download JSON)
- `src/components/settings/ClearMemoryButton.tsx` (NEW - confirm dialog)
- `src/app/(pandora-ui)/settings/page.tsx` (ENHANCE - integrate new components)

**Files to Create/Edit:**
- `tailwind.config.ts` (AUDIT - compare to research Section 3, add missing tokens)
- `src/components/settings/APIKeyManager.tsx` (NEW)
- `src/components/settings/ExportButton.tsx` (NEW)
- `src/components/settings/ClearMemoryButton.tsx` (NEW)
- `src/app/(pandora-ui)/settings/page.tsx` (ENHANCE)

### 3. Firestore Security Rules Gap (HIGH)
**Evidence:** `firestore.rules` (no `learning_queue` match), `docs/STATUS.md` (risk noted)

**Missing:**
- `learning_queue` collection has no rules stanza
- Risk: Potential data access vulnerability

**Files to Edit:**
- `firestore.rules` (ADD - `match /learning_queue/{docId} { allow read, write: if request.auth.uid != null; }` OR document exclusion)

### 4. Hardcoded Credentials/URLs (MEDIUM)
**Evidence:** `docs/STATUS.md` (risks section)

**Hardcoded Items:**
- `user@example.com` in `public/openapi-mcp.json`, `public/openapi-mcp.yaml`
- `joven.ong23@gmail.com` in `src/app/api/chatgpt/hybrid-retrieve/route.ts`
- `http://localhost:9002` in OpenAPI files
- `https://studio-sg--seismic-vista-480710-q5.asia-southeast1.hosted.app` in `src/app/api/chatgpt/openapi.yaml`

**Files to Edit:**
- `public/openapi-mcp.json` (REPLACE - use `DEFAULT_CHATGPT_USER_EMAIL` env var)
- `public/openapi-mcp.yaml` (REPLACE)
- `src/app/api/chatgpt/hybrid-retrieve/route.ts` (REPLACE)
- `src/app/api/chatgpt/openapi.yaml` (REPLACE - use env var for base URL)

---

## NEXT 10 ACTIONS (CONCRETE)

### Action 1: Fix Hybrid Search Tests
- **Owner:** Engineering
- **Files:** `tests/lib/hybrid-search.test.ts`, `jest.setup.js`
- **Commands:**
  ```bash
  # Add fetch shim to jest.setup.js
  # Convert test to Jest syntax
  npm test -- tests/lib/hybrid-search.test.ts
  ```
- **Acceptance:** Test passes, coverage for `src/lib/hybrid-search.ts` >85%

### Action 2: Write Memory Search Edge Case Tests
- **Owner:** Engineering
- **Files:** `src/__tests__/lib/memory-search-edge.test.ts` (NEW)
- **Commands:**
  ```bash
  # Create test file with cases: empty query, large set, embedding errors
  npm test -- src/__tests__/lib/memory-search-edge.test.ts
  ```
- **Acceptance:** All edge case tests pass (empty query returns [], large set <3s, embedding errors caught)

### Action 3: Write LLM Provider Error Handling Tests
- **Owner:** Engineering
- **Files:** `src/__tests__/lib/llm-provider-error.test.ts` (NEW)
- **Commands:**
  ```bash
  # Locate LLM provider abstraction (likely in src/ai/ or src/lib/)
  # Create test file with cases: timeout retries, quota fallback, invalid JSON
  npm test -- src/__tests__/lib/llm-provider-error.test.ts
  ```
- **Acceptance:** Tests pass for timeout (3x retry), quota (fallback), invalid JSON (error caught)

### Action 4: Create Cron Route Integration Tests
- **Owner:** Engineering
- **Files:** `src/__tests__/api/cron-*.test.ts` (NEW - 6 files)
- **Commands:**
  ```bash
  # Create test files for: cleanup, context-decay, daily-briefing, meta-learning, nightly-reflection, reindex-memories
  npm test -- src/__tests__/api/cron-*.test.ts
  ```
- **Acceptance:** All cron routes have tests (auth 401/403, happy path 200, idempotency, error handling), coverage >80%

### Action 5: Audit Tailwind Design Tokens
- **Owner:** Frontend
- **Files:** `tailwind.config.ts`
- **Commands:**
  ```bash
  # Compare current tokens to research Section 3 spec
  # Add missing: bg-main #0B0B0D, text-primary #EDEDED, accent #7F5AF0
  # Verify spacing: 4px baseline
  npm run dev  # Visual verification
  ```
- **Acceptance:** All Digital Void tokens match research spec, visual audit passes

### Action 6: Create Settings Page Components
- **Owner:** Frontend
- **Files:** `src/components/settings/APIKeyManager.tsx`, `ExportButton.tsx`, `ClearMemoryButton.tsx` (NEW)
- **Commands:**
  ```bash
  # Create components with Shadcn/UI primitives
  npm run dev  # Navigate to /settings, verify UI
  ```
- **Acceptance:** Settings page shows API key (masked), export button downloads JSON, clear memory shows confirmation

### Action 7: Fix Firestore Rules
- **Owner:** Backend
- **Files:** `firestore.rules`
- **Commands:**
  ```bash
  # Add learning_queue rules stanza OR document exclusion
  firebase deploy --only firestore:rules --project <project-id>
  ```
- **Acceptance:** Rules deploy without errors, `learning_queue` covered (or exclusion documented)

### Action 8: Replace Hardcoded Emails/URLs
- **Owner:** Backend
- **Files:** `public/openapi-mcp.json`, `public/openapi-mcp.yaml`, `src/app/api/chatgpt/hybrid-retrieve/route.ts`, `src/app/api/chatgpt/openapi.yaml`
- **Commands:**
  ```bash
  # Replace with env vars: DEFAULT_CHATGPT_USER_EMAIL, NEXT_PUBLIC_API_BASE_URL
  npm run build  # Verify no hardcoded values
  ```
- **Acceptance:** No hardcoded emails/URLs in code, env vars used, build passes

### Action 9: Enhance Memory Utils Tests
- **Owner:** Engineering
- **Files:** `src/lib/__tests__/memory-utils.test.ts`
- **Commands:**
  ```bash
  # Add edge cases: empty content, missing userId, large batches, embedding failures
  npm test -- src/lib/__tests__/memory-utils.test.ts
  ```
- **Acceptance:** Edge case tests pass, coverage >85%

### Action 10: Run Full Test Suite & Coverage
- **Owner:** Engineering
- **Files:** All test files
- **Commands:**
  ```bash
  npm test -- --coverage
  npm run test:integration  # If exists
  npm run test:e2e  # If Playwright installed
  ```
- **Acceptance:** All tests pass, overall coverage >80%, no regressions

---

## RISKS / SHARP EDGES

### Auth & Security
- **Risk:** Firestore rules gap (`learning_queue`) - potential unauthorized access
- **Mitigation:** Add rules stanza or document exclusion (Action 7)
- **Evidence:** `firestore.rules` (no match for `learning_queue`)

### Idempotency
- **Risk:** Cron jobs may not be idempotent (duplicate runs)
- **Mitigation:** Add idempotency tests (Action 4)
- **Evidence:** Cron routes have no tests currently

### Retries
- **Risk:** LLM provider timeouts/quota not handled gracefully
- **Mitigation:** Add retry logic tests (Action 3)
- **Evidence:** No tests for LLM error handling

### Schema Drift
- **Risk:** Firestore collections may have schema mismatches
- **Mitigation:** Add schema validation tests (optional, not in current scope)
- **Evidence:** Collections exist but no schema tests

### Tests
- **Risk:** Test infrastructure issues (missing shims, broken tests)
- **Mitigation:** Fix infrastructure first (Actions 1-2)
- **Evidence:** `docs/DR_STEP1_COVERAGE_AUDIT.md` (13 failed test suites)

---

## EVIDENCE POINTERS

### Research Sections → Repo Paths
- **Section 1 (Architecture Map):** `docs/01_ARCHITECTURE.md`, `ARCHITECTURE.md`
- **Section 3 (Design System):** `tailwind.config.ts`, `src/app/globals.css` (if exists)
- **Section 4 (Backend Implementation):** `src/app/api/`, `src/lib/`, `src/ai/`
- **Section 5 (API Contract Catalog):** `public/openapi.yaml`, `public/openapi-mcp.yaml`
- **Section 6 (Firestore Data Model):** `firestore.rules`, `firestore.indexes.json`, `docs/02_DATA_MODEL.md`
- **Section 10 (Test Plan):** `docs/08_TEST_STRATEGY.md`, `jest.config.cjs`, `jest.setup.js`
- **Section 12 (Kairos Plan):** `contracts/kairos_masterplan_v2.json`, `docs/11_LINEAR_PROJECT_PLAN.md`

### Current State Evidence
- **Completion Status:** `docs/STATUS.md`
- **Test Coverage:** `docs/DR_STEP1_COVERAGE_AUDIT.md`, `docs/DR_STEP3_COVERAGE_STATUS.md`
- **Risks:** `docs/STATUS.md` (Top Risks section)
- **Kairos Integration:** `src/lib/kairosClient.ts`, `src/lib/kairosEndpoints.ts`

---

## NOTES

- **Phase Structure Mismatch:** Deep Research describes 14-phase plan; codebase uses different phase IDs. Resolution: Extract architectural/design patterns from research, apply to current gaps (ignore phase ID mismatch).
- **Raw Research:** Paste complete Deep Research output into `docs/DEEP_RESEARCH_RAW.md` to enable full traceability.
