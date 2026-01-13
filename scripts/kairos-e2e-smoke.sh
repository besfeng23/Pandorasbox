#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${KAIROS_BASE_URL:-https://kairostrack.base44.app}"
BASE_URL="${BASE_URL%/}"

KAIROS_PLAN_REGISTER_URL="${KAIROS_PLAN_REGISTER_URL:-$BASE_URL/functions/kairosRegisterPlan}"
KAIROS_ACTIVE_PLAN_URL="${KAIROS_ACTIVE_PLAN_URL:-$BASE_URL/functions/kairosGetActivePlan}"
KAIROS_INGEST_URL="${KAIROS_INGEST_URL:-$BASE_URL/functions/ingest}"
KAIROS_RECOMPUTE_URL="${KAIROS_RECOMPUTE_URL:-$BASE_URL/functions/kairosRecompute}"

KAIROS_STABILIZATION_REGISTER_URL="${KAIROS_STABILIZATION_REGISTER_URL:-$BASE_URL/functions/kairosRegisterStabilization}"
KAIROS_STABILIZATION_ACTIVE_URL="${KAIROS_STABILIZATION_ACTIVE_URL:-$BASE_URL/functions/kairosGetActiveStabilization}"

AUTH_HEADER=()
if [[ -n "${KAIROS_INGEST_KEY:-}" ]]; then
  AUTH_HEADER=(-H "Authorization: Bearer ${KAIROS_INGEST_KEY}")
fi

banner() {
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "$1"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
}

post_json() {
  local url="$1"
  local json="$2"
  echo "POST $url"
  curl -sS -o /tmp/kairos_smoke_out.json -w "HTTP %{http_code}\n" \
    -X POST "$url" \
    -H "Content-Type: application/json" \
    "${AUTH_HEADER[@]}" \
    -d "$json"
  cat /tmp/kairos_smoke_out.json | head -c 1200 || true
  echo ""
}

get_json() {
  local url="$1"
  echo "GET  $url"
  curl -sS -o /tmp/kairos_smoke_out.json -w "HTTP %{http_code}\n" \
    -X GET "$url" \
    "${AUTH_HEADER[@]}"
  cat /tmp/kairos_smoke_out.json | head -c 1200 || true
  echo ""
}

banner "Kairos E2E Smoke (Base44 /functions/* endpoints)"
echo "Base URL: $BASE_URL"
echo ""
echo "Plan register:   $KAIROS_PLAN_REGISTER_URL"
echo "Active plan:     $KAIROS_ACTIVE_PLAN_URL"
echo "Ingest:          $KAIROS_INGEST_URL"
echo "Recompute:       $KAIROS_RECOMPUTE_URL"
echo "Stab register:   $KAIROS_STABILIZATION_REGISTER_URL"
echo "Stab active:     $KAIROS_STABILIZATION_ACTIVE_URL"
echo ""

banner "1) Register Track A plan"

PLAN_JSON="$(cat <<'JSON'
{
  "masterPlan": {
    "version": "pb.smoke.v1",
    "nodes": [
      {
        "nodeId": "PB-CORE-CHAT-001",
        "eventMappings": [
          {
            "type": "ui.chat.message_sent",
            "payloadMatch": ["threadId", "messageId"],
            "updates": { "status": "in_progress", "progressDelta": 0.2 }
          }
        ]
      }
    ]
  }
}
JSON
)"
post_json "$KAIROS_PLAN_REGISTER_URL" "$PLAN_JSON"

banner "2) (Optional) Register Track B stabilization"
if [[ "${KAIROS_ENABLE_STABILIZATION:-0}" == "1" ]]; then
  if [[ -f "contracts/kairos/stabilization_sprint_plan.json" ]]; then
    STAB_JSON="$(node - <<'NODE'
const fs = require('fs');
const plan = JSON.parse(fs.readFileSync('contracts/kairos/stabilization_sprint_plan.json','utf8'));
plan.registeredAt = new Date().toISOString();
plan.source = 'pandorasbox';
process.stdout.write(JSON.stringify(plan));
NODE
)"
    set +e
    post_json "$KAIROS_STABILIZATION_REGISTER_URL" "$STAB_JSON"
    rc=$?
    set -e
    if [[ $rc -ne 0 ]]; then
      echo "⚠️  Stabilization register failed. If you saw 404/501, Base44 may not have deployed Track B functions yet."
    fi
  else
    echo "⚠️  contracts/kairos/stabilization_sprint_plan.json not found; skipping."
  fi
else
  echo "Skipping (set KAIROS_ENABLE_STABILIZATION=1 to enable)."
fi
echo ""

banner "3) Ingest a sample event (batch wrapper form)"
EVENT_JSON="$(cat <<'JSON'
{
  "events": [
    {
      "event_id": "smoke_event_001",
      "event_time": "2026-01-13T00:00:00Z",
      "event_type": "ui.chat.message_sent",
      "source": "pandorasbox",
      "payload": {
        "threadId": "smoke_thread_123",
        "messageId": "smoke_message_456",
        "userId": "smoke_user_789"
      }
    }
  ]
}
JSON
)"
post_json "$KAIROS_INGEST_URL" "$EVENT_JSON"

banner "4) Trigger recompute"
post_json "$KAIROS_RECOMPUTE_URL" '{"reason":"smoke"}'

banner "5) Fetch active plan / rollups"
get_json "$KAIROS_ACTIVE_PLAN_URL"

banner "Done"
echo "✅ Smoke script completed. If all calls returned HTTP 200, events + rollups should be visible in Base44 Kairos."


