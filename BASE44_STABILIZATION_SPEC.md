# Base44 Kairos: Stabilization Sprint Implementation Spec

## Overview

Stabilization Sprint (Track B) is a **gating overlay** that blocks masterplan nodes until bugs are fixed. It does NOT complete tasks - it only adds blocking rules on top of the active masterplan.

## Storage Schema

### Collection: `kairos_stabilization_plans`

```typescript
interface StabilizationPlan {
  id: string;                    // Auto-generated document ID
  created_at: Timestamp;         // Registration timestamp
  source: string;                 // 'pandorasbox'
  is_active: boolean;             // Only one plan can be active at a time
  plan_json: {
    sprintName: string;
    bugClusters: Array<{
      rootCauseCategory: string;
      description: string;
      bugIds: string[];
    }>;
    fixSequence: string[];        // Ordered list of bug IDs
    gatingRules: Array<{
      bugId: string;
      blocksNodes: string[];      // Node IDs that are blocked
      explanation: string;
    }>;
    regressionChecklist: string[];
    rollbackStrategy: string[];
  };
}
```

**Indexes:**
- `is_active` (for querying active plan)
- `created_at` (for sorting)

## API Endpoints

### POST `/api/stabilization/register`

Registers a new stabilization plan and sets it as active (deactivates previous).

**Request Body:**
```json
{
  "sprintName": "Stabilization Sprint - Post-v1 Bug Fixes",
  "bugClusters": [...],
  "fixSequence": [...],
  "gatingRules": [...],
  "regressionChecklist": [...],
  "rollbackStrategy": [...],
  "registeredAt": "2026-01-13T12:00:00Z",
  "source": "pandorasbox"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "planId": "stabilization_plan_123",
  "message": "Stabilization plan registered and activated"
}
```

**Response (400 Bad Request):**
```json
{
  "success": false,
  "error": "Invalid plan structure: missing required field 'gatingRules'"
}
```

**Implementation Logic:**
1. Validate request body (required fields: `sprintName`, `bugClusters`, `fixSequence`, `gatingRules`)
2. Deactivate all existing active plans (`is_active = false`)
3. Create new document with `is_active = true`
4. Return plan ID

### GET `/api/stabilization/active`

Returns the currently active stabilization plan (if any).

**Response (200 OK):**
```json
{
  "success": true,
  "plan": {
    "id": "stabilization_plan_123",
    "created_at": "2026-01-13T12:00:00Z",
    "source": "pandorasbox",
    "is_active": true,
    "plan_json": {
      "sprintName": "Stabilization Sprint - Post-v1 Bug Fixes",
      "bugClusters": [...],
      "fixSequence": [...],
      "gatingRules": [...],
      "regressionChecklist": [...],
      "rollbackStrategy": [...]
    }
  }
}
```

**Response (404 Not Found):**
```json
{
  "success": false,
  "error": "No active stabilization plan"
}
```

## Gating Logic

### How Gating Works

1. **Read active stabilization plan** (if exists)
2. **For each node in masterplan**:
   - Check if node is blocked by any `gatingRule`
   - A node is blocked if:
     - `gatingRule.bugId` is in the `fixSequence` AND
     - `gatingRule.blocksNodes` includes the node ID AND
     - Bug is not yet marked as "fixed" (see bug status tracking below)

3. **Display gate status**:
   - Node shows "Blocked by stabilization gate" if blocked
   - Shows which bug(s) are blocking it
   - Node cannot be marked "done" while blocked

### Bug Status Tracking

Bugs can be tracked in a separate collection or as part of the plan:

**Option A: Separate collection** `kairos_stabilization_bugs`
```typescript
{
  bugId: string;           // e.g., "PBX-001"
  status: 'open' | 'fixed' | 'verified';
  fixedAt?: Timestamp;
  verifiedAt?: Timestamp;
  planId: string;          // Links to stabilization plan
}
```

**Option B: Embedded in plan** (simpler, but requires plan update on bug fix)
```typescript
plan_json: {
  // ... existing fields
  bugStatus: {
    "PBX-001": "fixed",
    "PBX-002": "open",
    // ...
  }
}
```

**Recommendation**: Use Option A for better audit trail and independent bug tracking.

## UI Changes

### 1. Stabilization Banner (Overview Page)

Display at top of Kairos dashboard when active plan exists:

```
┌─────────────────────────────────────────────────────────────┐
│ 🚧 STABILIZATION SPRINT ACTIVE                              │
│                                                               │
│ Sprint: Stabilization Sprint - Post-v1 Bug Fixes            │
│                                                               │
│ 📊 Status:                                                    │
│   • P0 Bugs: 1 (PBX-002)                                     │
│   • P1 Bugs: 9 (PBX-001, PBX-003, ...)                       │
│   • Fixed: 0 / 10                                            │
│                                                               │
│ 🔍 Top Root Causes:                                          │
│   1. UI/UX Incomplete or Incorrect (9 bugs)                  │
│   2. Backend Integration Failure (1 bug)                    │
│                                                               │
│ 🚪 Gate Status: 8 nodes blocked                             │
└─────────────────────────────────────────────────────────────┘
```

**Computation:**
- P0/P1 counts: Count bugs by priority (if available) or by fix sequence order
- Top root causes: Group by `rootCauseCategory`, sort by bug count
- Gate status: Count nodes that are currently blocked

### 2. Task Detail: Blocking Indicator

In task/node detail view, show blocking status:

```
┌─────────────────────────────────────────────────────────────┐
│ Node: PB-CORE-CHAT-001                                       │
│ Status: In Progress                                          │
│                                                               │
│ ⚠️  BLOCKED BY STABILIZATION GATE                            │
│                                                               │
│ This node cannot be marked "done" until the following bugs  │
│ are fixed:                                                   │
│                                                               │
│   • PBX-002: Backend Integration Failure                     │
│     Blocks: PB-CORE-CHAT-001, PB-LANES-ORCH-001, ...        │
│     Explanation: Chat interface and orchestrator cannot be  │
│     considered done while AI responses hang.                 │
│                                                               │
│   • PBX-001: UI/UX Incomplete                                │
│     Blocks: PB-CORE-CHAT-001                                 │
│     Explanation: Chat UI is not delivering message history. │
│                                                               │
│   • PBX-003: UI/UX Incomplete                                │
│     Blocks: PB-CORE-CHAT-001, PB-COPY-CONTENT-001           │
│     Explanation: Lack of role differentiation/timestamps... │
└─────────────────────────────────────────────────────────────┘
```

### 3. Bug Status Management UI

Add a section to mark bugs as fixed/verified:

```
┌─────────────────────────────────────────────────────────────┐
│ Stabilization Bugs                                           │
│                                                               │
│ [PBX-002] Backend Integration Failure                        │
│ Status: [Open ▼]  [Mark Fixed]                               │
│                                                               │
│ [PBX-001] UI/UX Incomplete                                    │
│ Status: [Open ▼]  [Mark Fixed]                               │
│                                                               │
│ ...                                                           │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Checklist

### Backend (Base44)

- [ ] Create `kairos_stabilization_plans` collection
- [ ] Create `kairos_stabilization_bugs` collection (if using Option A)
- [ ] Implement `POST /api/stabilization/register`
  - [ ] Validate request body
  - [ ] Deactivate existing active plans
  - [ ] Create new plan document
  - [ ] Initialize bug status tracking
- [ ] Implement `GET /api/stabilization/active`
  - [ ] Query for `is_active = true`
  - [ ] Return plan JSON
- [ ] Implement gating logic in progress computation
  - [ ] Read active stabilization plan
  - [ ] Check each node against gating rules
  - [ ] Mark nodes as blocked if bugs not fixed
- [ ] Add bug status update endpoint (if using Option A)
  - [ ] `POST /api/stabilization/bugs/:bugId/status`
  - [ ] Update bug status (open → fixed → verified)

### Frontend (Base44)

- [ ] Add stabilization banner component
  - [ ] Show when active plan exists
  - [ ] Display P0/P1 counts
  - [ ] Show top root causes
  - [ ] Display gate status
- [ ] Add blocking indicator to task detail
  - [ ] Show "BLOCKED BY STABILIZATION GATE" badge
  - [ ] List blocking bugs with explanations
  - [ ] Disable "Mark Done" button when blocked
- [ ] Add bug status management UI
  - [ ] List all bugs from active plan
  - [ ] Allow marking bugs as fixed/verified
  - [ ] Show bug status in list view

## Example Curl Commands

### Register Plan

```bash
curl -X POST https://kairostrack.base44.app/api/stabilization/register \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -d '{
    "sprintName": "Stabilization Sprint - Post-v1 Bug Fixes",
    "bugClusters": [...],
    "fixSequence": ["PBX-002", "PBX-001", ...],
    "gatingRules": [...],
    "regressionChecklist": [...],
    "rollbackStrategy": [...],
    "registeredAt": "2026-01-13T12:00:00Z",
    "source": "pandorasbox"
  }'
```

### Get Active Plan

```bash
curl https://kairostrack.base44.app/api/stabilization/active \
  -H 'Authorization: Bearer YOUR_KEY'
```

### Update Bug Status (if using Option A)

```bash
curl -X POST https://kairostrack.base44.app/api/stabilization/bugs/PBX-002/status \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_KEY' \
  -d '{
    "status": "fixed",
    "fixedAt": "2026-01-13T14:00:00Z"
  }'
```

## Verification Checklist

After implementing in Base44:

1. **Register plan**:
   ```bash
   npm run kairos:register:stabilization
   ```
   - [ ] Returns HTTP 200
   - [ ] Plan stored in `kairos_stabilization_plans`
   - [ ] Plan marked as `is_active = true`
   - [ ] Previous active plans deactivated

2. **Check active plan**:
   ```bash
   curl https://kairostrack.base44.app/api/stabilization/active
   ```
   - [ ] Returns active plan JSON
   - [ ] All fields present

3. **Verify UI**:
   - [ ] Stabilization banner appears on overview
   - [ ] P0/P1 counts correct
   - [ ] Top root causes displayed
   - [ ] Gate status shows blocked node count

4. **Check task blocking**:
   - [ ] Navigate to PB-CORE-CHAT-001 detail
   - [ ] See "BLOCKED BY STABILIZATION GATE" indicator
   - [ ] See list of blocking bugs (PBX-002, PBX-001, PBX-003)
   - [ ] "Mark Done" button disabled

5. **Test bug fix flow**:
   - [ ] Mark PBX-002 as "fixed"
   - [ ] Verify PBX-002 no longer blocks nodes
   - [ ] Check that PB-CORE-CHAT-001 still blocked by PBX-001, PBX-003
   - [ ] Mark all blocking bugs as "fixed"
   - [ ] Verify node can now be marked "done"

## Important Notes

1. **Gating is additive, not replacement**: Stabilization gates ADD blocking rules on top of masterplan. Masterplan completion logic still applies.

2. **No task completion**: Stabilization does NOT mark tasks as "done". It only prevents them from being marked "done" until bugs are fixed.

3. **Bug status is independent**: Bug status (open/fixed/verified) is tracked separately from node status. A bug can be "fixed" but node still blocked by other bugs.

4. **Multiple plans**: Only one plan can be active at a time. Registering a new plan deactivates the previous one.

5. **Plan versioning**: Consider adding a `version` field to plans for tracking changes over time.

