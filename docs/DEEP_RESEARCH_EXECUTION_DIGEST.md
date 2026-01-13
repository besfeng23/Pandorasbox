=== 1) EXECUTION DIGEST ===

WHERE WE ARE NOW
- Pandora's Box codebase exists at ~93% completion (per STATUS.md, Jan 2025)
- Core infrastructure deployed: Firebase (Auth, Firestore, Hosting), Next.js 15 App Router, Gemini LLM integration
- Phases 1-5, 8 marked Done (100%); Phases 3, 6, 10, 12, 15 In Progress (50-89%)
- Modules complete: Agents/Cron (100%), Memory/Embeddings (100%), MCP/Integrations (100%), Knowledge Graph (100%), Artifacts (100%)
- Module gaps: Tests (70%), UI/UX - Digital Void Shell (42%)
- GitHub webhook gateway for Kairos evidence ingestion recently deployed (packages/kairos-github-gateway)
- Known risks: Firestore rules gaps (learning_queue missing), hardcoded emails/URLs in some endpoints

DECISIONS LOCKED
- Default LLM provider is Gemini (branded as "Pandora" in UI, never "Gemini" in user-facing text)
- Architecture: Next.js 15 App Router + Firebase (Hosting, Functions, Firestore, Auth) + Vertex AI for Gemini
- Data model: Firestore collections (threads, history, memories, artifacts, settings, system_*)
- Integration pattern: MCP server + ChatGPT Actions API + API key auth for external integrations
- Testing strategy: Unit (Jest) + Integration (Firebase Emulator) + E2E (Playwright)
- Design system: Dark-first "Digital Void" theme, Shadcn/UI components, Tailwind tokens
- Evidence tracking: GitHub webhooks → Cloud Run gateway → Kairos ingest + recompute

WHAT TO DO NEXT (RANKED)
1) Complete test coverage to 80%+ (PB-OPS-TEST-001, PB-OPS-TEST-002) — Tests module at 70%, missing unit/integration for edge cases, E2E gaps for voice/image flows
2) Finish UI/UX polish to match "Digital Void" spec (PB-UI-DS-003, PB-UI-CHAT-001, PB-UI-SETTINGS-001) — UI/UX module at 42%, design system tokens incomplete, Settings page gaps
3) Address Firestore security rules gaps (learning_queue collection, verify all collections covered)
4) Replace hardcoded emails/URLs with env vars (DEFAULT_CHATGPT_USER_EMAIL, per-risk items in STATUS.md)
5) Complete Phase 10: Conscious Orchestration Layer (50% → 100%) — Multi-step agent orchestration logic incomplete
6) Complete Phase 12: Reflection & Self-Diagnosis (89% → 100%) — Self-diagnosis capabilities missing
7) Implement Phase 7: Self-Healing & Autonomous Recovery (0% → 100%) — Error recovery automation not started
8) Document API contracts (OpenAPI specs for MCP, ChatGPT Actions, internal APIs) — Research Section 5 outlines full catalog
9) Implement PandoraUI Dashboard telemetry display (PB-OPS-OBS-002) — Phase 11 partially done
10) Validate all acceptance criteria from research Section 10 against current E2E test suite

BLOCKERS / RISKS
- HIGH: Firestore rules gap (learning_queue) — potential data access vulnerability; fix by adding rules stanza or documenting intentional exclusion
- HIGH: Hardcoded credentials/URLs — privacy/portability risk; mitigate by moving to env vars (see STATUS.md items)
- MEDIUM: Test coverage at 70% — regressions possible in uncovered paths; prioritize unit tests for memory search, LLM provider edge cases
- MEDIUM: UI/UX at 42% — design system tokens may be inconsistent; audit Tailwind theme against research Section 3 spec
- LOW: Phase structure mismatch — Deep Research describes 14-phase plan; codebase uses different phase IDs; reconcile for Kairos tracking or ignore if research is blueprint-only

EVIDENCE POINTERS
- Research Section 1: Architecture Map (Firebase stack, Next.js SSR, Gemini LLM layer)
- Research Section 3: Design System (Digital Void theme, tokens, Shadcn/UI components)
- Research Section 4: Backend Implementation Spec (API routes, Firestore schemas, LLMProvider interface)
- Research Section 5: Full API Contract Catalog (endpoints, request/response schemas)
- Research Section 6: Firestore Data Model (collections, indexes, security rules)
- Research Section 10: Test Plan (unit/integration/E2E scope, acceptance criteria mapping)
- Research Section 12: Kairos Track A Plan JSON (node IDs, dependencies, evidence mapping)

