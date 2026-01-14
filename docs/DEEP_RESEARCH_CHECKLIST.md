# Deep Research Execution Checklist

> **Purpose:** Runnable commands for CI/local verification  
> **Date:** 2026-01-14  
> **Usage:** Run commands in order, verify each step passes

---

## PRE-FLIGHT CHECKS

### 1. Verify Dependencies
```bash
npm install
```
**Expected:** No errors, all dependencies installed

### 2. Verify Test Infrastructure
```bash
npm test -- --listTests
```
**Expected:** Lists all test files, no errors

### 3. Verify Build
```bash
npm run build
```
**Expected:** Build succeeds, no TypeScript errors

---

## TEST COVERAGE AUDIT

### 4. Run Coverage Report
```bash
npm test -- --coverage --coverageReporters=text-summary
```
**Expected:** Coverage report shows modules <80%, identify: hybrid-search, memory-utils, cron routes

### 5. Run Coverage with Details
```bash
npm test -- --coverage --coverageReporters=text
```
**Expected:** Detailed coverage per file, note 0% coverage files

---

## UNIT TESTS

### 6. Run Hybrid Search Test (Fix First)
```bash
npm test -- tests/lib/hybrid-search.test.ts
```
**Expected:** Test passes (after fixing fetch shim)

### 7. Run Memory Utils Test
```bash
npm test -- src/lib/__tests__/memory-utils.test.ts
```
**Expected:** All tests pass, coverage >85%

### 8. Run Memory Search Edge Cases Test (After Creation)
```bash
npm test -- src/__tests__/lib/memory-search-edge.test.ts
```
**Expected:** Tests pass for empty query, large set, embedding errors

### 9. Run LLM Provider Error Test (After Creation)
```bash
npm test -- src/__tests__/lib/llm-provider-error.test.ts
```
**Expected:** Tests pass for timeout retries, quota fallback, invalid JSON

---

## INTEGRATION TESTS

### 10. Run Cron Route Tests (After Creation)
```bash
npm test -- src/__tests__/api/cron-*.test.ts
```
**Expected:** All 6 cron route tests pass, coverage >80% each

### 11. Run Knowledge Upload Test (If Exists)
```bash
npm test -- src/__tests__/api/knowledge-upload.test.ts
```
**Expected:** PDF upload test creates chunks, embeddings generated

### 12. Run Security Rules Test (If Exists)
```bash
npm test -- src/__tests__/api/security-rules.test.ts
```
**Expected:** Unauthorized access attempts return 403/denied

---

## E2E TESTS (IF PLAYWRIGHT INSTALLED)

### 13. Run E2E Tests
```bash
npm run test:e2e
```
**Expected:** Playwright tests pass (voice, image, artifact flows)

---

## DESIGN SYSTEM AUDIT

### 14. Audit Tailwind Config (Manual)
```bash
cat tailwind.config.ts | grep -A 30 "colors:"
```
**Expected:** Compare to research Section 3 spec (bg-main #0B0B0D, text-primary #EDEDED, accent #7F5AF0)

### 15. Verify Typography
```bash
cat tailwind.config.ts | grep -A 10 "fontFamily:"
```
**Expected:** Inter/SF Pro, 16px base (verify in config)

### 16. Verify Spacing
```bash
cat tailwind.config.ts | grep -A 5 "spacing:"
```
**Expected:** 4px baseline (verify in config or CSS)

---

## UI VERIFICATION

### 17. Start Dev Server
```bash
npm run dev
```
**Expected:** Server starts on http://localhost:9002

### 18. Navigate to Settings Page
```bash
# Open browser: http://localhost:9002/settings
```
**Expected:** Settings page loads, shows API key (masked), export button, clear memory button

### 19. Test Export Button
```bash
# Click export button in browser
```
**Expected:** JSON file downloads

### 20. Test Clear Memory Button
```bash
# Click clear memory button in browser
```
**Expected:** Confirmation dialog appears

---

## FIRESTORE RULES VALIDATION

### 21. Validate Rules Syntax
```bash
firebase deploy --only firestore:rules --project <project-id> --dry-run
```
**Expected:** No syntax errors (or use Firebase console validation)

### 22. Deploy Rules (If Valid)
```bash
firebase deploy --only firestore:rules --project <project-id>
```
**Expected:** Deploy succeeds, learning_queue covered (or exclusion documented)

---

## HARDCODED VALUES CHECK

### 23. Check for Hardcoded Emails
```bash
grep -r "user@example.com\|joven.ong23@gmail.com" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.yaml" src/ public/
```
**Expected:** No matches (or only in env var defaults)

### 24. Check for Hardcoded URLs
```bash
grep -r "localhost:9002\|studio-sg--seismic" --include="*.ts" --include="*.tsx" --include="*.json" --include="*.yaml" src/ public/
```
**Expected:** No matches (or only in env var defaults)

---

## FULL TEST SUITE

### 25. Run All Tests
```bash
npm test
```
**Expected:** All tests pass, 10+ test suites, 58+ tests

### 26. Run Full Coverage
```bash
npm test -- --coverage
```
**Expected:** Overall coverage >80%, all tests pass

### 27. Run Integration Tests (If Exists)
```bash
npm run test:integration
```
**Expected:** All integration tests pass

---

## LINT & TYPECHECK

### 28. Run Linter
```bash
npm run lint
```
**Expected:** No linting errors

### 29. Run Type Check
```bash
npm run typecheck
```
**Expected:** No TypeScript errors

---

## BUILD VERIFICATION

### 30. Production Build
```bash
npm run build
```
**Expected:** Build succeeds, no errors, no hardcoded values

---

## KAIROS SIGNAL SEND

### 31. Send Deep Research Signal
```bash
npm run kairos:deep-research-signal
# OR
tsx scripts/send-deep-research-signal.ts
```
**Expected:** Signal sent successfully (200 response), event appears in Kairos

---

## FINAL VERIFICATION

### 32. Verify All Acceptance Criteria
```bash
# Review docs/DEEP_RESEARCH_TASK_PACKET.md acceptance tests section
# Check each item:
# - [ ] Memory search empty query returns []
# - [ ] Memory search with 1000+ memories completes in <3s
# - [ ] LLM provider timeout retries 3x
# - [ ] All cron routes have tests
# - [ ] Settings page shows API key (masked)
# - [ ] Export button downloads JSON
# - [ ] Clear memory shows confirmation
# - [ ] Tailwind theme tokens match spec
# - [ ] Firestore rules deploy without errors
# - [ ] No hardcoded emails/URLs in build
# - [ ] Overall test coverage >80%
```
**Expected:** All acceptance criteria met

---

## NOTES

- **CI/CD:** Commands 1-30 should be runnable in CI (no manual browser steps)
- **Manual Steps:** Commands 17-20 require browser (can skip in CI, verify locally)
- **Firebase:** Commands 21-22 require Firebase CLI and project access
- **Playwright:** Command 13 requires Playwright installed (skip if not available)
