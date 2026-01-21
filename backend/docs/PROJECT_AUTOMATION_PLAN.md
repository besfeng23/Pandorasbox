# Pandora’s Box — Docs + Kairos + Linear Automation Plan (Repo-Derived)

This doc is the canonical execution spec for the **Kairos** documentation + automation spine.

Hard rules:
- Repo-derived only. Do not invent features.
- If unknown, use minimal `Assumption:` lines.
- Phase count must be **discovered** from `scripts/seed-phases.ts` (do not hardcode 1–15).
- Mermaid must be valid and renderable.
- Scripts must be idempotent and deterministic (same output for same repo state).
- Never print or commit secrets; use environment variables.

## Goal
Implement Kairos by:
1) Creating a full `/docs` set (12 docs) + essential extras referenced by the plan
2) Creating Mermaid diagrams in `/docs/diagrams`
3) Implementing `scripts/generate-status.ts` to output `docs/STATUS.md` + `docs/status.json` deterministically
4) Implementing `scripts/linear-sync.ts` to create/update a Linear project + issues idempotently using a stable marker
5) Updating `package.json` scripts: `docs:status` and `linear:sync`

## Implementation plan (execute in order)
1. **Repo inventory** (private to implementation): confirm stack/deps, routes/actions, flows/agents, rules/indexes.\n2. **Create docs structure**: `docs/` and `docs/diagrams/`.\n3. **Write docs set**: `docs/00_README.md` … `docs/11_LINEAR_PROJECT_PLAN.md` + `docs/LINEAR_SETUP.md` + `docs/QUICKSTART_DOCS_AND_LINEAR.md`.\n4. **Create Mermaid diagrams**: sequences + architecture + phase map.\n5. **Implement `scripts/generate-status.ts`**: deterministic module/phase scoring (config-driven) + risk detection.\n6. **Implement `scripts/linear-sync.ts`**: Phase epics + module children; idempotent via `PB-KAIROS:<slug>` and optional `.kairos/linear-map.json` cache.\n7. **Update package scripts**: `docs:status`, `linear:sync`.\n8. **Sanity checks**: `npm test`, `npm run typecheck`, `npm run lint` if feasible; document blockers.\n+
## Idempotency contract
- `generate-status`: rewrites `docs/status.json` and `docs/STATUS.md` deterministically (no timestamps).\n- `linear-sync`: updates existing Linear issues based on marker `PB-KAIROS:<slug>`; optional local cache `.kairos/linear-map.json` to reduce API calls.\n+
## Phase discovery contract
- Phases MUST be discovered from `scripts/seed-phases.ts`.\n- `PHASE_IMPLEMENTATION_STATUS.md` is a secondary human report; mismatches must be surfaced in `docs/STATUS.md`/`docs/status.json`.\n+

