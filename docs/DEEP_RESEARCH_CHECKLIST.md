=== 4) READY-TO-RUN CHECKLIST ===

Test Coverage Audit:
- Command: `npm test -- --coverage --coverageReporters=text-summary`
- Expected: Coverage report shows modules <80%, identify memory search, LLM provider, cron jobs

Unit Tests (Memory Search Edge Cases):
- Command: `npm test -- src/__tests__/lib/memory-search-edge.test.ts`
- Expected: Tests pass for empty query, large result set, embedding errors

Unit Tests (LLM Provider Error Handling):
- Command: `npm test -- src/__tests__/lib/llm-provider-error.test.ts`
- Expected: Tests pass for timeout retries, quota fallback, invalid JSON parsing

Integration Tests (Knowledge Upload):
- Command: `npm run test:integration -- src/__tests__/api/knowledge-upload.test.ts` (or with emulator)
- Expected: PDF upload test creates chunks in Firestore, embeddings generated

Integration Tests (Security Rules):
- Command: `npm run test:integration -- src/__tests__/api/security-rules.test.ts`
- Expected: Unauthorized access attempts return 403/denied

E2E Tests (Voice/Image/Artifact):
- Command: `npm run test:e2e -- tests/e2e/voice-image-flows.spec.ts`
- Expected: Playwright tests pass for voice recording, image upload, artifact download

Design System Token Audit:
- Command: `cat tailwind.config.ts | grep -A 30 "colors:"` then compare to research Section 3 spec
- Expected: Colors match (bg-main #0B0B0D, text-primary #EDEDED, accent #7F5AF0), typography (Inter/SF Pro, 16px base), spacing (4px baseline)

Settings Page UI Verification:
- Command: `npm run dev` then navigate to http://localhost:9002/settings
- Expected: API key displayed (masked), export button triggers download, clear memory shows confirmation

Firestore Rules Validation:
- Command: `firebase deploy --only firestore:rules --project <project-id>`
- Expected: No errors, learning_queue collection covered (or documented exclusion)

Full Test Suite:
- Command: `npm test && npm run test:integration && npm run test:e2e`
- Expected: All tests pass, coverage 80%+

