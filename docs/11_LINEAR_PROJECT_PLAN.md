# Linear Project Plan — WBS (Epics → Stories/Tasks)

## Executive summary
Kairos syncs repo reality into Linear as a project with **two epic dimensions**:
- **Phase epics**: top-level issues labeled `phase:<n>`
- **Module epics**: top-level issues labeled `module:<name>`

Work items are created under **Phase epics** and tagged with the relevant **module label**, so you can slice by phase or module in Linear views.

## Technical details
### Canonical mapping (implemented by `scripts/linear-sync.ts`)
- **Project**: “Kairos — Pandora’s Box Control Tower”
- **Top-level epics**:
  - Phase epics: `Phase <id>: <title>`
  - Module epics: `Module: <module name>`
- **Child issues**:
  - Created under the relevant Phase epic
  - Labeled `module:<module>` and `area:<frontend|backend|infra|docs>`
  - Include acceptance criteria and “Where in code”

### Idempotency contract
Every epic/issue description contains a stable marker:\n- `PB-KAIROS:<slug>`

Kairos also maintains:\n- `.kairos/linear-map.json` (slug → Linear IDs cache; safe to commit, no secrets)

### Status mapping (repo-derived signals)
Linear states are mapped from Kairos status (see `docs/status.json`):\n- Done → completed\n- In Progress → started\n- Planned → unstarted/backlog

## Where in code
- Linear sync: `scripts/linear-sync.ts`
- Module/phase config: `scripts/kairos.config.ts`
- Status source: `scripts/generate-status.ts` and `docs/status.json`

## Assumptions
None.


