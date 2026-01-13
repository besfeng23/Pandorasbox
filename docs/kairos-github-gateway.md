# Kairos GitHub Gateway (Cloud Run)

This service ingests **real GitHub evidence** (PRs, workflow runs, releases) and forwards it to Kairos (Track A) via:

GitHub Webhook → **Cloud Run** (`/webhooks/github`) → `kairosIngestEvent` → `kairosRecompute`

## What this unlocks

- **Deterministic task mapping** using Track A `nodeId` (e.g. `PB-CORE-CHAT-001`)
- **Idempotent** evidence processing (webhook retries won’t double-count)
- **Secure** webhook verification (HMAC SHA256 on **raw request bytes**)

## Non‑negotiables implemented

- **Webhook signature verification**:
  - Route uses `express.raw({ type: 'application/json' })` (raw bytes).
  - Verifies `X-Hub-Signature-256: sha256=<hex>`.
  - Rejects mismatches with **401**.
- **NodeId extraction** (deterministic):
  - Regex: `\\bPB-[A-Z0-9]+-[A-Z0-9]+-\\d{3}\\b`
  - Priority: **PR title → branch → commit messages → PR body**
  - If no nodeId: **emit nothing** (logs “no nodeId”).
- **Workflow mapping**:
  - Only maps successful `workflow_run` completions to:
    - `github.workflow.lint_pass`
    - `github.workflow.unit_pass`
    - `github.workflow.integration_pass`
    - `github.workflow.e2e_pass`
  - If unmapped: **emit nothing**.
- **Dedupe**:
  - Firestore TTL doc: `kairos_webhook_dedupe/{dedupe_key}` with `expiresAt = now + 24h`
  - If Firestore isn’t available: in-memory Map TTL fallback
  - Dedupe key format:
    - `<event_type>:<repo>:<pr_number|run_id|sha>:<node_id>`
    - Note: `<repo>` is sanitized to be Firestore document-id safe (slashes `/` → `_`).
- **Recompute**:
  - After ingesting 1..N events, gateway calls `POST /functions/kairosRecompute` with `{"full": true}` **once**.

## Repo layout

Gateway lives here:

- `packages/kairos-github-gateway/`
  - `src/server.ts`
  - `src/github/verify.ts`
  - `src/github/parse.ts`
  - `src/kairos/client.ts`
  - `src/utils/nodeid.ts`
  - `src/utils/dedupe.ts`

## Environment variables

Required:

- **`KAIROS_BASE_URL`**: base URL, e.g. `https://kairostrack.base44.app`
- **`GITHUB_WEBHOOK_SECRET`**: GitHub webhook secret (used for HMAC)

Optional:

- **`KAIROS_INGEST_SECRET`** (or `KAIROS_INGEST_KEY`): sent as `Authorization: Bearer ...`
- **`KAIROS_INGEST_EVENT_URL`**: overrides `${KAIROS_BASE_URL}/functions/kairosIngestEvent`
- **`KAIROS_RECOMPUTE_URL`**: overrides `${KAIROS_BASE_URL}/functions/kairosRecompute`
- **`ALLOWED_REPOS`**: comma-separated allowlist like `owner/repo,owner2/repo2`
- **`DEDUPE_MODE=memory`**: force in-memory dedupe (useful locally)
- **`FIRESTORE_EMULATOR_HOST`**: if using Firestore emulator locally

## PR naming conventions (enforced by mapping)

To map a GitHub change to a Kairos Track A task, include the nodeId in **any** of:

1) **PR title** (preferred)  
2) Branch name  
3) Commit message footer: `Kairos-Node: PB-...`  
4) PR body (optional)

Examples:

- PR title: `PB-CORE-CHAT-001 Add streaming responses`
- Branch: `feature/PB-CORE-MEMORY-001-memory-index`
- Commit footer:
  - `Kairos-Node: PB-OPS-EXPORT-002`

## Run locally

```bash
cd packages/kairos-github-gateway
npm install
set KAIROS_BASE_URL=https://kairostrack.base44.app
set GITHUB_WEBHOOK_SECRET=your_secret
npm run dev
```

Then the gateway listens on `http://localhost:8080/webhooks/github` (or `PORT`).

## Deploy to Cloud Run

Use the provided script:

- `packages/kairos-github-gateway/scripts/deploy-cloudrun.sh`
- `packages/kairos-github-gateway/scripts/deploy-cloudrun.ps1`

## GitHub webhook setup (UI checklist)

In your repo:

- Settings → Webhooks → **Add webhook**
  - **Payload URL**: `https://<cloud-run-url>/webhooks/github`
  - **Content type**: `application/json`
  - **Secret**: same as `GITHUB_WEBHOOK_SECRET`
  - **Events**: `pull_request`, `workflow_run`, `release`
  - **Active**: enabled

Screenshots checklist (for your runbook):

- [ ] Cloud Run service URL
- [ ] Webhook created (payload URL + events + active)
- [ ] Recent deliveries show `200`
- [ ] Cloud Run logs show `ingested > 0` + recompute call

## Test with curl (signed request)

On a shell with `openssl`:

```bash
SECRET="your_webhook_secret"
BODY='{"action":"opened","repository":{"full_name":"acme/widgets"},"pull_request":{"number":12,"title":"PB-CORE-CHAT-001 Example","head":{"ref":"feature/PB-CORE-CHAT-001","sha":"abc123"},"html_url":"https://github.com/acme/widgets/pull/12","created_at":"2026-01-13T00:00:00Z","updated_at":"2026-01-13T00:00:01Z"}}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | awk '{print $NF}')"

curl -i -X POST "http://localhost:8080/webhooks/github" \
  -H "Content-Type: application/json" \
  -H "X-GitHub-Event: pull_request" \
  -H "X-Hub-Signature-256: $SIG" \
  --data "$BODY"
```

## Firestore TTL setup (recommended)

To have Firestore automatically delete old dedupe docs, configure TTL on the field:

- Collection: `kairos_webhook_dedupe`
- Field: `expiresAt`


