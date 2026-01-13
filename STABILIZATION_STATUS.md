# Stabilization Sprint Status & Next Steps

## ✅ Completed (Pandora's Box Repo)

### 1. Contract File
- ✅ **File exists**: `contracts/kairos/stabilization_sprint_plan.json`
- ✅ Contains complete stabilization plan with:
  - 10 bugs (1 P0, 9 P1)
  - 10 gating rules
  - Fix sequence
  - Regression checklist
  - Rollback strategy

### 2. Publish Script
- ✅ **Script exists**: `scripts/kairos-register-stabilization.ts`
- ✅ Reads contract file
- ✅ POSTs to `https://kairostrack.base44.app/functions/kairosRegisterStabilization`
- ✅ Supports auth headers and signing
- ✅ Includes validation and error handling
- ✅ **npm script added**: `kairos:register:stabilization`

### 3. Documentation
- ✅ `BASE44_STABILIZATION_SPEC.md` - Complete Base44 implementation spec
- ✅ `STABILIZATION_SPRINT_SETUP.md` - Setup guide
- ✅ `KAIROS_EVENT_EMISSION.md` - Updated with Track B mention

## ⏳ Pending (Base44 Kairos Implementation)

### 4. Base44 Storage & APIs

**Storage Required:**
- [ ] Create `kairos_stabilization_plans` collection/table
- [ ] Fields: `id`, `created_at`, `source`, `is_active`, `plan_json`
- [ ] Index on `is_active` for querying active plan

**APIs Required:**
- [ ] `POST /functions/kairosRegisterStabilization`
  - Validate request body
  - Deactivate existing active plans
  - Create new plan with `is_active = true`
  - Return plan ID
  
- [ ] `GET /functions/kairosGetActiveStabilization`
  - Query for `is_active = true`
  - Return plan JSON or 404 if none active

**See**: `BASE44_STABILIZATION_SPEC.md` for complete implementation details

### 5. Gating Overlay in Rollups

**Required Logic:**
- [ ] Load active masterplan during rollup recompute
- [ ] Load active stabilization plan (if exists)
- [ ] For each node in masterplan:
  - Check if blocked by any `gatingRule` that maps **bug → affected nodes**
  - Node is blocked if:
    - `gatingRule.blocksNodes` includes node ID AND
    - Bug status is **OPEN** (only OPEN bugs block)
  - Optional severity support:
    - **P0** can block phase-level gates/global rollups
    - **P1** blocks only the affected tasks/nodes
- [ ] Mark nodes as `blocked` if gates fail
- [ ] **Do NOT** count stabilization as progress
- [ ] Stabilization only affects status/eligibility

**Bug Status Tracking:**
- [ ] Create `kairos_stabilization_bugs` collection (Option A - recommended)
  - Fields: `bugId`, `status` (open/fixed/verified), `fixedAt`, `verifiedAt`, `planId`
- [ ] OR embed bug status in plan JSON (Option B - simpler but less flexible)
- [ ] Add endpoint: `POST /functions/kairosSetStabilizationBugStatus` (or equivalent) (if using Option A)
- [ ] Add endpoint: `POST /functions/kairosSetStabilizationBugStatus` (or equivalent) (if using Option A)

**See**: `BASE44_STABILIZATION_SPEC.md` section "Gating Logic"

### 6. UI Banner & Indicators

**Overview Page:**
- [ ] Add stabilization banner component
  - Show when active plan exists
  - Display P0/P1 counts
  - Show top 3 root-cause clusters
  - Display gate status (X nodes blocked)

**Task Detail Page:**
- [ ] Add blocking indicator
  - Show "BLOCKED BY STABILIZATION GATE" badge
  - List blocking bugs with explanations
  - Disable "Mark Done" button when blocked

**Bug Management UI:**
- [ ] Add bug status management section
  - List all bugs from active plan
  - Allow marking bugs as fixed/verified
  - Show bug status in list view

**See**: `BASE44_STABILIZATION_SPEC.md` section "UI Changes"

## 🚀 Ready to Execute

### Step 1: Register Plan (Pandora's Box)

```bash
# Set environment variables
export KAIROS_BASE_URL=https://kairostrack.base44.app
export KAIROS_INGEST_KEY=your_key_here  # If required

# Register stabilization plan
npm run kairos:register:stabilization
```

**Expected Result:**
- HTTP 200 response
- Plan stored in Base44
- Plan marked as active

**If endpoint doesn't exist yet:**
- You'll get HTTP 404 or 501
- This means Base44 needs to implement the endpoints first (Step 4)

### Step 2: Verify Registration

```bash
# Check active plan
curl https://kairostrack.base44.app/functions/kairosGetActiveStabilization \
  -H 'Authorization: Bearer YOUR_KEY'
```

**Expected Result:**
- Returns active plan JSON
- All fields present

### Step 3: End-to-End Test

1. **Register masterplan** (if not already done)
2. **Register stabilization plan**: `npm run kairos:register:stabilization`
3. **Emit events**: `npm run kairos:simulate`
4. **Verify in Kairos UI**:
   - [ ] Live Activity shows events
   - [ ] Stabilization banner appears
   - [ ] Tasks reflect gating (blocked where appropriate)
   - [ ] Blocked nodes show gate status

## 📋 Implementation Priority

**If Base44 endpoints don't exist yet:**

1. **Implement storage** (Step 4.1) - 30 min
2. **Implement APIs** (Step 4.2) - 1 hour
3. **Test registration** (Step 1) - 5 min
4. **Wire gating logic** (Step 5) - 2 hours
5. **Add UI components** (Step 6) - 2 hours
6. **End-to-end test** (Step 3) - 15 min

**Total Base44 work**: ~5-6 hours

## 🔍 Quick Verification

Run this to check if endpoints exist:

```bash
# Test register endpoint
curl -X POST https://kairostrack.base44.app/functions/kairosRegisterStabilization \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'

# Test active endpoint  
curl https://kairostrack.base44.app/functions/kairosGetActiveStabilization
```

- **404/501**: Endpoints not implemented yet → Implement Step 4
- **400**: Endpoints exist but validation failed → Good, endpoints work!
- **200**: Endpoints exist and working → Proceed to Step 1

## 📝 Files Reference

- **Contract**: `contracts/kairos/stabilization_sprint_plan.json`
- **Publish Script**: `scripts/kairos-register-stabilization.ts`
- **Base44 Spec**: `BASE44_STABILIZATION_SPEC.md`
- **Setup Guide**: `STABILIZATION_SPRINT_SETUP.md`

