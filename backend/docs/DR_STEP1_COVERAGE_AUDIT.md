# DR Step 1: Test Coverage Audit

**Date:** 2026-01-13  
**Command:** `npm run test:coverage`

## Summary

- **Test Suites:** 13 failed, 2 passed, 15 total
- **Tests:** 16 failed, 11 passed, 27 total
- **Overall Coverage:** Multiple modules below 80% threshold

## Modules <80% Coverage (Prioritized)

### HIGH PRIORITY (Per Task Packet)

#### Memory Search
- **Module:** `src/lib/hybrid-search.ts` - **0% coverage**
- **Status:** Test file exists (`tests/lib/hybrid-search.test.ts`) but fails due to missing fetch shim
- **Gap:** No unit tests for memory search edge cases (empty query, large result sets, embedding errors)
- **Action:** Write unit tests for memory search edge cases (STEP 2)

#### LLM Provider
- **Module:** Not explicitly visible in coverage output (may be in `src/ai/` or abstracted)
- **Status:** Need to identify LLM provider implementation location
- **Gap:** No unit tests for LLM provider error handling (timeout retries, quota exceeded, invalid JSON)
- **Action:** Write unit tests for LLM provider error handling (STEP 3)

#### Cron Jobs
- **Modules:** Multiple cron endpoints at **0% coverage**:
  - `app/api/cron/cleanup/route.ts` - 0%
  - `app/api/cron/context-decay/route.ts` - 0%
  - `app/api/cron/daily-briefing/route.ts` - 0%
  - `app/api/cron/meta-learning/route.ts` - 0%
  - `app/api/cron/nightly-reflection/route.ts` - 0%
  - `app/api/cron/reindex-memories/route.ts` - 0%
  - `app/api/cron/deep-research/route.ts` - 100% (exception)
- **Gap:** No integration tests for cron job idempotency, error handling
- **Action:** Write integration tests for cron jobs

### OTHER MODULES <80%

#### Low Coverage Modules (0%):
- `src/lib/external-cache.ts` - 0% (tests exist but fail)
- `src/lib/context-manager.ts` - 0%
- `src/lib/context-store.ts` - 0%
- `src/lib/memory-utils.ts` - 0%
- `src/lib/meta-learning.ts` - 0%
- `src/lib/vector.ts` - 0%
- Most API routes: 0% coverage
- Most components: 0% coverage

#### Partial Coverage:
- `src/lib/graph-analytics.ts` - 32.87% statements, 18.46% branches
- `src/lib/knowledge-graph.ts` - 16.86% statements, 6.06% branches
- `src/lib/temporal-analysis.ts` - 21.21% statements, 11.76% branches
- `src/lib/utils.ts` - 9.09% statements, 0% branches
- `src/components/GraphView.tsx` - 29.03% statements, 16.66% branches

## Test Failures (Blockers)

### Critical Failures:
1. **Syntax Error:** `src/app/(pandora-ui)/components/ChatMessages.tsx:203` - Unterminated regexp literal
2. **Missing Module:** `src/app/api/system/knowledge/route` - Cannot find module
3. **Missing Functions:** Multiple test files reference functions that don't exist:
   - `relationship-manager.test.ts` - `findRelationshipPatterns`, `inferRelationshipsFromMemories`, etc.
   - `knowledge-graph.test.ts` - `upsertKnowledgeNode`, `createKnowledgeEdge`, etc.
4. **Missing Shims:** `tests/lib/hybrid-search.test.ts` - Missing Web Fetch API type (need `import 'openai/shims/node'`)
5. **ReferenceError:** Multiple tests - `Request is not defined` (need proper Next.js test setup)

### Test Infrastructure Issues:
- Missing proper Jest setup for Next.js API routes (Request/Response not defined)
- Missing OpenAI shims in test files
- Broken test files with no actual tests (empty test suites)

## Recommendations

1. **Fix test infrastructure first:** Address syntax errors and missing shims before adding new tests
2. **Prioritize STEP 2:** Write unit tests for memory search edge cases (target: `src/lib/hybrid-search.ts`)
3. **Prioritize STEP 3:** Write unit tests for LLM provider error handling (need to locate LLM provider implementation)
4. **Fix existing broken tests:** Repair relationship-manager, knowledge-graph, external-cache test failures
5. **Add cron job tests:** Write integration tests for cron endpoints (STEP 4 covers knowledge upload, but cron jobs need separate tests)

## Next Steps

- **STEP 2:** Write unit tests for memory search edge cases
- **STEP 3:** Write unit tests for LLM provider error handling  
- **STEP 4:** Write integration test for knowledge upload (may require fixing test infrastructure first)

