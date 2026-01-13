# Pandora → Kairos Event Contract (LOCKED)

## Source of truth
- contracts/kairos_masterplan_v2.json is the ONLY source of allowed event_types + required_fields.

## Hard rules
- Do NOT invent event types.
- Do NOT mark progress locally; Kairos computes progress.
- Every emitted event must include:
  - event_id (uuid)
  - event_time (ISO)
  - source="pandorasbox"
  - correlation_id (stable per workflow)
  - dedupe_key (recommended)
- Payloads must satisfy required_fields exactly as defined in kairos_masterplan_v2.

## Deliverables required
- src/lib/kairosClient.ts (sendEvent/sendEvents with retries/backoff + safe logs)
- Runtime validation for event payloads (zod or lightweight)
- scripts/kairos-simulate.ts that reads the JSON and sends 1–2 sample flows
- Optional GitHub Actions hooks for tests/deploy/failure → Kairos events
- A short RUNBOOK.md with env vars + verification steps
