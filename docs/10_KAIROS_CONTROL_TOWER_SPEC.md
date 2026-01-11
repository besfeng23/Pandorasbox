# Kairos Control Tower — Canonical Spec

## Executive summary
Kairos is the repo-grounded “control tower” for Pandora’s Box:
- It scans the repository (no network) and produces an at-a-glance cockpit (`docs/STATUS.md`) and machine-readable state (`docs/status.json`).
- It can sync that state into Linear idempotently via stable issue markers.

## Technical details
### Outputs
- **Human-readable**: `docs/STATUS.md` (cockpit-clean)
- **Machine-readable**: `docs/status.json` (full detail)
- **Generator**: `scripts/generate-status.ts`
- **Scoring config**: `scripts/kairos.config.ts`
- **Linear sync**: `scripts/linear-sync.ts`

### Taxonomy
- **Modules**: defined in `scripts/kairos.config.ts` (stable `id`, `name`, `area`, weighted `signals[]`, optional `phaseIds[]`).
- **Phases**: discovered from `scripts/seed-phases.ts` (Kairos does not hardcode phase count).

### Status model
Kairos maps completion percent to coarse statuses:
- **Done**: ≥ 90%
- **In Progress**: 40–89%
- **Planned**: < 40%

### Signals model (“repo reality”)
Signals are local-only evidence checks (files/routes/rules/indexes/tests).\nThey never call external networks and never require credentials.

### Risks model
Kairos emits `topRisks[]` from best-effort detectors:\n- hardcoded emails/URLs\n- rules coverage gaps vs `.collection('...')` usage\n- best-effort index gap checks for known query patterns

### Idempotency and determinism
- **Determinism**: stable sorting, stable keys, no timestamps.
- **Idempotency**:
  - Status generation uses write-if-changed.
  - Linear sync uses stable marker `PB-KAIROS:<slug>` plus optional cache `.kairos/linear-map.json`.

### Linear integration contract
Project structure created by `scripts/linear-sync.ts`:
- **Project**: “Kairos — Pandora’s Box Control Tower”
- **Phase epics**: top-level issues labeled `phase:<n>`
- **Module epics**: top-level issues labeled `module:<name>`
- **Child issues**: under Phase epics (phase-scoped work items) labeled `module:<name>` and `area:<...>`

## Where in code
- Config: `scripts/kairos.config.ts`
- Generator: `scripts/generate-status.ts`
- Linear sync: `scripts/linear-sync.ts`
- Outputs: `docs/STATUS.md`, `docs/status.json`

## Assumptions
None.


