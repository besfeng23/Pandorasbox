# ✅ Stabilization Sprint: Ready to Publish

## Status: All Pandora's Box Work Complete

### ✅ Step 1: Contract File Verified
- **File**: `contracts/kairos/stabilization_sprint_plan.json` ✅ EXISTS
- **Content**: Complete stabilization plan with 10 bugs, 10 gating rules, fix sequence, regression checklist, rollback strategy

### ✅ Step 2: Publish Script Ready
- **Script**: `scripts/kairos-register-stabilization.ts` ✅ EXISTS
- **npm command**: `npm run kairos:register:stabilization` ✅ ADDED
- **Features**:
  - Reads contract file
  - POSTs to `https://kairostrack.base44.app/api/stabilization/register`
  - Supports auth headers (`KAIROS_INGEST_KEY`)
  - Supports HMAC signing (`KAIROS_SIGNING_SECRET`)
  - Validates plan structure
  - Generates curl commands for manual testing
  - Error handling and clear output

## 🚀 Next Action: Publish to Base44

### Run This Command:

```bash
# Set Base44 URL
export KAIROS_BASE_URL=https://kairostrack.base44.app

# Optional: Set auth if required
export KAIROS_INGEST_KEY=your_key_here
export KAIROS_SIGNING_SECRET=your_secret_here

# Publish stabilization plan
npm run kairos:register:stabilization
```

### Expected Outcomes:

**If Base44 endpoints exist:**
- ✅ HTTP 200 response
- ✅ Plan registered and activated
- ✅ Previous active plans deactivated
- ✅ Success message with plan ID

**If Base44 endpoints don't exist yet:**
- ❌ HTTP 404 or 501
- ⚠️  This means Base44 needs to implement endpoints first
- 📋 See `BASE44_STABILIZATION_SPEC.md` for implementation guide

## 📋 Base44 Implementation Required

If endpoints don't exist, Base44 needs to implement:

### 1. Storage (30 min)
- Create `kairos_stabilization_plans` collection
- Fields: `id`, `created_at`, `source`, `is_active`, `plan_json`
- Index on `is_active`

### 2. APIs (1 hour)
- `POST /api/stabilization/register` - Register and activate plan
- `GET /api/stabilization/active` - Get active plan

### 3. Gating Logic (2 hours)
- Wire into rollup recompute
- Check nodes against gating rules
- Mark nodes as blocked if bugs not fixed
- Do NOT count stabilization as progress

### 4. UI Components (2 hours)
- Stabilization banner (overview page)
- Blocking indicator (task detail page)
- Bug status management UI

**Full spec**: See `BASE44_STABILIZATION_SPEC.md`

## 🔍 Quick Test: Do Endpoints Exist?

```bash
# Test register endpoint
curl -X POST https://kairostrack.base44.app/api/stabilization/register \
  -H 'Content-Type: application/json' \
  -d '{"test": true}'

# Test active endpoint
curl https://kairostrack.base44.app/api/stabilization/active
```

**Results:**
- **404/501**: Endpoints not implemented → Implement Base44 endpoints first
- **400**: Endpoints exist (validation failed) → Good! Run publish script
- **200**: Endpoints exist and working → Ready to publish

## 📊 What Gets Published

The script will send:
- **Sprint Name**: "Stabilization Sprint - Post-v1 Bug Fixes"
- **Bug Clusters**: 2 clusters (UI/UX: 9 bugs, Backend: 1 bug)
- **Fix Sequence**: 10 bugs in priority order
- **Gating Rules**: 10 rules blocking 8 unique nodes
- **Regression Checklist**: 15 test scenarios
- **Rollback Strategy**: 6 rollback steps

## ✅ Verification Checklist

After publishing:

1. **Registration succeeds**:
   ```bash
   npm run kairos:register:stabilization
   ```
   - [ ] HTTP 200 response
   - [ ] Plan ID returned

2. **Check active plan**:
   ```bash
   curl https://kairostrack.base44.app/api/stabilization/active
   ```
   - [ ] Returns active plan JSON
   - [ ] All fields present

3. **Verify in UI** (after Base44 implements UI):
   - [ ] Stabilization banner appears
   - [ ] P0: 1 bug, P1: 9 bugs
   - [ ] Top root causes displayed
   - [ ] Gate status: 8 nodes blocked
   - [ ] Blocked nodes show gate indicator

4. **Test gating**:
   - [ ] Navigate to PB-CORE-CHAT-001
   - [ ] See "BLOCKED BY STABILIZATION GATE"
   - [ ] See blocking bugs: PBX-002, PBX-001, PBX-003
   - [ ] "Mark Done" button disabled

## 📁 Files Reference

- **Contract**: `contracts/kairos/stabilization_sprint_plan.json`
- **Publish Script**: `scripts/kairos-register-stabilization.ts`
- **Base44 Spec**: `BASE44_STABILIZATION_SPEC.md` (complete implementation guide)
- **Setup Guide**: `STABILIZATION_SPRINT_SETUP.md`
- **Status**: `STABILIZATION_STATUS.md`

## 🎯 Summary

**Pandora's Box side**: ✅ **100% COMPLETE**
- Contract file exists
- Publish script ready
- npm command added
- Documentation complete

**Base44 side**: ⏳ **PENDING IMPLEMENTATION**
- Storage schema defined
- API endpoints specified
- Gating logic documented
- UI components specified

**Next step**: Run `npm run kairos:register:stabilization` to publish, or implement Base44 endpoints first if they don't exist.

