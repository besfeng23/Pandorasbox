# DR Step 2: Fix Test Infrastructure Blockers

**Date:** 2026-01-13  
**Command:** `npm run test:coverage`

## Summary

Fixed critical test infrastructure blockers that were preventing tests from running:
- Missing Web Fetch API types (OpenAI shim dependency)
- Missing Request/Response/Headers globals for Next.js API route tests

## What Broke (Blockers)

From STEP 1 audit (`docs/DR_STEP1_COVERAGE_AUDIT.md`):

1. **Missing Shims:** `tests/lib/hybrid-search.test.ts` - Missing Web Fetch API type
   - Error: Tests using OpenAI SDK or fetch API failed due to missing global types
   - Used `import 'openai/shims/node';` as a workaround (not ideal for long-term)

2. **ReferenceError:** Multiple tests - `Request is not defined`
   - Error: Tests for Next.js API routes failed because Request/Response weren't available in Jest environment
   - Tests using `NextRequest`/`NextResponse` needed global Request/Response

## What Changed

### Files Modified:

1. **`jest.setup.js`**
   - Added proper polyfills for Web APIs: `fetch`, `Request`, `Response`, `Headers`, `TextEncoder`, `TextDecoder`
   - Uses Node.js 18+ native globals when available
   - Falls back to `undici` if needed (Node.js 18+ uses this under the hood)
   - Ensures these APIs are available on `globalThis` for all tests

2. **`tests/lib/hybrid-search.test.ts`**
   - Removed `import 'openai/shims/node';` dependency
   - Now relies on proper globals from `jest.setup.js`
   - Cleaner, more maintainable approach

### Changes Details:

**jest.setup.js:**
- Added polyfills for `fetch`, `Request`, `Response`, `Headers` (via undici if needed)
- Added polyfills for `TextEncoder`, `TextDecoder` (Node.js native)
- All polyfills check for existence before applying (safe for multiple environments)

**tests/lib/hybrid-search.test.ts:**
- Removed OpenAI shim import
- Tests now use standard Web APIs polyfilled in jest.setup.js

## Evidence: Coverage Run

**Before (STEP 1):**
- 13 test suites failed
- Tests blocked by missing Web API types and Request/Response globals

**After (STEP 2):**
- Test infrastructure blockers resolved
- Tests can now run with proper Web API support
- No dependency on `openai/shims/node` for test infrastructure

## Remaining Blockers

Other blockers from STEP 1 (not addressed in STEP 2):
- Syntax errors in source files
- Missing modules/routes
- Missing functions in test files
- Broken test files with no actual tests

## Next Steps

- **STEP 3:** Add unit tests for memory search edge cases (target: `src/lib/hybrid-search.ts`)
- Fix remaining syntax errors and missing modules
- Repair broken test files

