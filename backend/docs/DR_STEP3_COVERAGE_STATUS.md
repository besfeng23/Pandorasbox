# DR Step 3: Coverage Status Before Fixes

**Date:** 2026-01-13  
**Command:** `npm run test:coverage`

## Test Suites Summary

- **Test Suites:** 13 failed, 2 passed, 15 total
- **Tests:** 16 failed, 11 passed, 27 total
- **Snapshots:** 0 total
- **Time:** 8.232s

## Top 10 Failure First-Lines

1. **tests/lib/hybrid-search.test.ts** - `this environment is missing the following Web Fetch API type: fetch is not defined`
2. **tests/api/hybrid-retrieve.test.ts** - `ReferenceError: Request is not defined`
3. **src/lib/__tests__/relationship-manager.test.ts** - `TypeError: (0 , _relationshipmanager.findRelationshipPatterns) is not a function`
4. **src/lib/__tests__/knowledge-graph.test.ts** - `TypeError: (0 , _knowledgegraph.upsertKnowledgeNode) is not a function`
5. **src/lib/__tests__/graph-analytics.test.ts** - `TypeError: firestoreAdmin.collection(...).where(...).orderBy is not a function`
6. **src/__tests__/graph-api.test.ts** - `ReferenceError: Request is not defined`
7. **src/app/api/__tests__/graph-api.test.ts** - `Cannot find module '../../system/knowledge/route'`
8. **tests/lib/external-cache.test.ts** - `TypeError: The argument 'methodName' must be a method. Received undefined`
9. **src/__tests__/chat-composer-mic-send.test.tsx** - `Syntax Error: Unterminated regexp literal` at `ChatMessages.tsx:203`
10. **src/components/__tests__/GraphView.test.tsx** - `TypeError: Cannot read properties of undefined (reading 'length')`

## Coverage Table for src/lib/hybrid-search.ts + Cron Routes

### src/lib/hybrid-search.ts
- **Statements:** 0%
- **Branches:** 0%
- **Functions:** 0%
- **Lines:** 0%
- **Status:** Test file exists but fails to run due to missing fetch shim

### Cron Routes (All 0% Coverage)

#### app/api/cron/cleanup/route.ts
- **Statements:** 0%
- **Branches:** 0%
- **Functions:** 0%
- **Lines:** 0%

#### app/api/cron/context-decay/route.ts
- **Statements:** 0%
- **Branches:** 0%
- **Functions:** 0%
- **Lines:** 0%

#### app/api/cron/daily-briefing/route.ts
- **Statements:** 0%
- **Branches:** 0%
- **Functions:** 0%
- **Lines:** 0%

#### app/api/cron/meta-learning/route.ts
- **Statements:** 0%
- **Branches:** 0%
- **Functions:** 0%
- **Lines:** 0%

#### app/api/cron/nightly-reflection/route.ts
- **Statements:** 0%
- **Branches:** 0%
- **Functions:** 0%
- **Lines:** 0%

#### app/api/cron/reindex-memories/route.ts
- **Statements:** 0%
- **Branches:** 0%
- **Functions:** 0%
- **Lines:** 0%

## Key Issues to Address

### Hybrid Search Test Issues
1. Test file uses Node.js test runner syntax but project uses Jest
2. Missing fetch shim for OpenAI SDK in Jest environment
3. Test file needs to be converted to Jest syntax
4. Need to add edge case tests (empty query, embedding failures, empty results, large sets, timeouts)

### Cron Route Test Issues
1. No test files exist for cron routes
2. Need to create integration tests for:
   - Auth required (401/403)
   - Happy path (200)
   - Idempotency
   - Error handling
3. Need to mock Firebase Admin and external dependencies

## Next Steps

1. **TASK A:** Fix hybrid-search tests
   - Convert test file to Jest syntax
   - Add fetch shim/globals setup
   - Add edge case tests (empty query, embedding failures, empty results, large sets, timeouts)
   - Target: >85% coverage

2. **TASK B:** Create cron route test harness
   - Create test files for all 6 cron routes
   - Add auth tests (401/403)
   - Add happy path tests (200)
   - Add idempotency tests
   - Add error handling tests
   - Target: Move from 0% to >80% coverage

