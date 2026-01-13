# Stabilization Sprint (Track B) Setup Guide

## Overview

Stabilization Sprint is a **gating overlay** (Track B) that blocks masterplan nodes until bugs are fixed. It does NOT complete tasks - it only adds blocking rules on top of the active masterplan.

## Files Created

1. **Contract**: `contracts/kairos/stabilization_sprint_plan.json`
   - Source of truth for stabilization plan
   - Contains bug clusters, gating rules, fix sequence, regression checklist, rollback strategy

2. **Registration Script**: `scripts/kairos-register-stabilization.ts`
   - Reads contract file
   - POSTs to Base44 Kairos `/functions/kairosRegisterStabilization`
   - Supports authentication and signing

3. **Base44 Spec**: `BASE44_STABILIZATION_SPEC.md`
   - Complete implementation spec for Base44
   - Storage schema, API endpoints, UI changes, gating logic

4. **Documentation Updates**:
   - `KAIROS_EVENT_EMISSION.md` - Added Track B mention
   - `package.json` - Added `kairos:register:stabilization` script

## Quick Start

### 1. Register Stabilization Plan

```bash
# Set Base44 URL
export KAIROS_BASE_URL=https://kairostrack.base44.app

# Optional: Set auth key
export KAIROS_INGEST_KEY=your_key_here

# Optional: Set signing secret
export KAIROS_SIGNING_SECRET=your_secret_here

# Register plan
npm run kairos:register:stabilization
```

### 2. Verify Registration

```bash
# Check active plan
curl https://kairostrack.base44.app/functions/kairosGetActiveStabilization \
  -H 'Authorization: Bearer YOUR_KEY'
```

### 3. Check UI

- Navigate to Kairos dashboard
- Look for stabilization banner at top
- Check that blocked nodes show gate status
- Verify P0/P1 counts match bug clusters

## Example Curl Command

```bash
curl -X POST https://kairostrack.base44.app/functions/kairosRegisterStabilization \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -d '{
    "sprintName": "Stabilization Sprint - Post-v1 Bug Fixes",
    "bugClusters": [
      {
        "rootCauseCategory": "UI/UX Incomplete or Incorrect",
        "description": "UI state management and feature implementation issues...",
        "bugIds": ["PBX-001", "PBX-003", "PBX-004", "PBX-005", "PBX-006", "PBX-007", "PBX-008", "PBX-009", "PBX-010"]
      },
      {
        "rootCauseCategory": "Backend Integration Failure",
        "description": "Backend process or integration (AI response generation)...",
        "bugIds": ["PBX-002"]
      }
    ],
    "fixSequence": ["PBX-002", "PBX-001", "PBX-004", "PBX-009", "PBX-003", "PBX-007", "PBX-008", "PBX-006", "PBX-005", "PBX-010"],
    "gatingRules": [
      {
        "bugId": "PBX-002",
        "blocksNodes": ["PB-CORE-CHAT-001", "PB-LANES-ORCH-001", "PB-LANES-ANS-001"],
        "explanation": "Chat interface and orchestrator cannot be considered done while AI responses hang..."
      }
      // ... more rules
    ],
    "regressionChecklist": [...],
    "rollbackStrategy": [...],
    "registeredAt": "2026-01-13T12:00:00Z",
    "source": "pandorasbox"
  }'
```

## Verification Checklist

After registering the plan in Base44:

- [ ] **Registration succeeds**: HTTP 200 from `/functions/kairosRegisterStabilization`
- [ ] **Registration succeeds**: HTTP 200 from `/functions/kairosRegisterStabilization`
- [ ] **Plan stored**: Check `kairos_stabilization_plans` collection
- [ ] **Plan active**: Only one plan with `is_active = true`
- [ ] **Banner appears**: Stabilization banner visible on overview page
- [ ] **P0/P1 counts**: Correct bug counts displayed
- [ ] **Root causes**: Top 3 root-cause clusters shown
- [ ] **Gate status**: Blocked node count displayed
- [ ] **Task blocking**: Navigate to PB-CORE-CHAT-001, see blocking indicator
- [ ] **Bug list**: All 10 bugs listed with status
- [ ] **Gating logic**: Nodes cannot be marked "done" while blocked

## Gating Rules Summary

| Bug ID | Blocks Nodes | Priority |
|--------|--------------|----------|
| PBX-002 | PB-CORE-CHAT-001, PB-LANES-ORCH-001, PB-LANES-ANS-001 | P0 |
| PBX-001 | PB-CORE-CHAT-001 | P1 |
| PBX-003 | PB-CORE-CHAT-001, PB-COPY-CONTENT-001 | P1 |
| PBX-004 | PB-CORE-THREADS-001 | P1 |
| PBX-005 | PB-COPY-CONTENT-001 | P1 |
| PBX-006 | PB-CORE-MEMORY-001 | P1 |
| PBX-007 | PB-CORE-KB-001 | P1 |
| PBX-008 | PB-CORE-ARTIFACTS-001, PB-CORE-GRAPH-001 | P1 |
| PBX-009 | PB-CORE-SETTINGS-001, PB-OPS-EXPORT-001 | P1 |
| PBX-010 | PB-COPY-CONTENT-001 | P1 |

**Total**: 10 bugs blocking 8 unique nodes

## Important Notes

1. **Gating is additive**: Stabilization gates ADD blocking rules on top of masterplan. Masterplan completion logic still applies.

2. **No task completion**: Stabilization does NOT mark tasks as "done". It only prevents them from being marked "done" until bugs are fixed.

3. **Bug status tracking**: Bugs must be tracked separately (see `BASE44_STABILIZATION_SPEC.md` for implementation options).

4. **Multiple plans**: Only one plan can be active at a time. Registering a new plan deactivates the previous one.

## Next Steps

1. **Implement Base44 endpoints** (see `BASE44_STABILIZATION_SPEC.md`)
   - Storage schema
   - API endpoints
   - Gating logic
   - UI components

2. **Register plan**:
   ```bash
   npm run kairos:register:stabilization
   ```

3. **Verify in UI**:
   - Check banner appears
   - Verify blocking indicators
   - Test bug status updates

4. **Track bug fixes**:
   - Mark bugs as "fixed" as they're resolved
   - Verify nodes unblock when all blocking bugs are fixed
   - Confirm nodes can be marked "done" after unblocking

## Related Files

- **Contract**: `contracts/kairos/stabilization_sprint_plan.json`
- **Registration Script**: `scripts/kairos-register-stabilization.ts`
- **Base44 Spec**: `BASE44_STABILIZATION_SPEC.md`
- **Event Emission Docs**: `KAIROS_EVENT_EMISSION.md` (Track A)

