# Linear Setup — Kairos Sync

## Purpose
Set up Linear API access so `scripts/linear-sync.ts` can create/update the **“Kairos — Pandora’s Box Control Tower”** project and keep epics/issues aligned with repo reality.

## What the script does (idempotent)
`scripts/linear-sync.ts` will:
- Create/update a Linear Project named **Kairos — Pandora’s Box Control Tower**
- Create **Phase epics** (parents) based on phases discovered from `scripts/seed-phases.ts`
- Create **Module issues** as children under the phase epic, tagged with `module:<name>`
- Update existing issues instead of duplicating using marker `PB-KAIROS:<slug>` in issue descriptions
- Optionally maintain `.kairos/linear-map.json` as a local slug→id cache (safe to commit; no secrets)

## Environment variables
### Required
- `LINEAR_API_KEY`: Linear API key (do not commit)

### Optional
- `LINEAR_TEAM_KEY`: If set, the script targets that team. If omitted, the script defaults to the first accessible team.\n\nAssumption: team selection cannot be derived from repo; defaulting is required when `LINEAR_TEAM_KEY` is absent.

## Create a Linear API key
1. In Linear, open **Settings** → **API**.\n2. Create a new **Personal API key**.\n3. Store it in your environment as `LINEAR_API_KEY`.\n\nDo not paste the key into docs or commit it.

## Run safely
From repo root:
- `npm run linear:sync`

The script prints:
- Created/updated counts\n- Project URL\n- Errors (never prints secrets)

## Where in code
- `scripts/linear-sync.ts` (Linear GraphQL client + idempotency)\n- `scripts/generate-status.ts` (taxonomy + status mapping source)\n- `scripts/kairos.config.ts` (module/phase signals + weights)\n- `docs/status.json` (machine-readable input to Linear sync)\n


