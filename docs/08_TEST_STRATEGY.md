# Test Strategy — What exists, what’s missing, minimal additions

## Purpose
Document the current test harness and propose a minimal, repo-aligned test strategy (unit/integration/e2e), without inventing systems not present in the codebase.

## What exists today (repo-derived)
- Test runner: Jest config exists at `jest.config.js` and setup at `jest.setup.js`.\n- Existing tests:\n  - `src/__tests__/*`\n  - `tests/*`\n\nExamples (inventory):\n- Graph API and graph view tests: `src/__tests__/graph-api.test.ts`, `src/__tests__/graph-view.test.tsx`\n- Hybrid retrieval tests: `tests/api/hybrid-retrieve.test.ts`\n- Hybrid search tests: `tests/lib/hybrid-search.test.ts`\n
## Coverage areas
### Unit tests (core libs)
Prioritize deterministic modules:\n- `src/lib/chunking.ts` (chunking)\n- `src/lib/vector.ts` (embedding wrapper surface — mock network)\n- `src/lib/hybrid-search.ts` and `src/lib/external-cache.ts` (cache and scoring)\n- `src/lib/context-manager.ts` (weighting math)\n- `src/lib/rate-limit.ts` (token bucket)\n
### Integration tests (API routes and actions)
Focus on “pure” request/response logic where Firebase/Admin can be mocked:\n- `src/app/api/chatgpt/*/route.ts`\n- `src/app/api/mcp/*/route.ts`\n- `src/app/api/cron/*/route.ts` (auth gating + control flow)\n
### E2E tests (optional)
Assumption: No Playwright/Cypress harness is currently in repo; add only if needed.\n\nIf adding, keep minimal:\n- smoke test login\n- send message, verify response renders\n- open settings, upload knowledge (if feasible)\n
## Testing constraints (realistic)
- Many flows call external providers (OpenAI/Tavily/Genkit). Tests should mock these calls.\n- Firebase Admin requires credentials; tests should use emulator or mocks.\n\nAssumption: CI can inject secrets via env vars; local tests should not require secrets by default.\n
## Minimal additions recommended
1. Add targeted mocks for OpenAI/Tavily in tests.\n2. Add a small test helper for Firebase Admin initialization to avoid accidental production calls.\n3. Add “schema snapshot” tests for OpenAPI routes.\n
## Where in code
- Jest config: `jest.config.js`, `jest.setup.js`\n- Existing tests: `src/__tests__/*`, `tests/*`\n- API routes to test: `src/app/api/**/route.ts`\n- Libraries to test: `src/lib/*`\n


