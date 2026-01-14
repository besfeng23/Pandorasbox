# Base44 Synchronization with Cursor and Kairos

This document describes the Base44 API integration for synchronizing Base44 with Cursor and Kairos.

## Overview

The Base44 sync system provides automated synchronization between:
- **Base44**: Project management and tracking platform
- **Kairos**: Master plan and phase objectives
- **Cursor**: Development environment

## Features

1. **Plan Alignment**: Fetch and update active phase data
2. **Master Plan Snapshot**: Sync phase objectives from Kairos to Base44
3. **Phase ↔ System Map**: Track system status per phase
4. **Bug Impact Map**: Map active bugs to phases
5. **Alignment Checklist**: Track synchronization status

## Setup

### Environment Variables

Add these to your `.env` file:

```bash
# Base44 API Configuration
BASE44_API_URL=https://kairostrack.base44.app
BASE44_API_KEY=your_base44_api_key_here

# Kairos Configuration (for fetching phase objectives)
KAIROS_BASE_URL=https://kairostrack.base44.app
KAIROS_INGEST_KEY=your_kairos_api_key_here  # Optional, for authenticated requests
```

### Installation

The Base44 client is already included in the codebase. No additional installation needed.

## Usage

### Basic Sync

Run the synchronization script:

```bash
npm run base44:sync
```

This will:
1. Fetch the active phase from Base44
2. Fetch the phase objective from Kairos
3. Update the phase objective in Base44 if different
4. Fetch and update system status
5. Map active bugs to the phase
6. Update the alignment checklist

### Dry Run

Test the sync without making changes:

```bash
npm run base44:sync:dry-run
```

### Verbose Output

See detailed output of the sync process:

```bash
npm run base44:sync:verbose
```

### Sync Specific Phase

Sync a specific phase by ID:

```bash
npm run base44:sync -- --phase-id phase-123
```

## API Reference

### Base44 Client (`src/lib/base44Client.ts`)

#### Plan Alignment

```typescript
// Fetch active phase
const phase = await fetchActivePhase();

// Update phase data
await updatePhaseData({
  phaseId: 'phase-123',
  status: 'active',
  // ... other fields
});
```

#### Master Plan Snapshot

```typescript
// Fetch phase objective from Kairos
const objective = await fetchPhaseObjectiveFromKairos('phase-123');

// Update phase objective in Base44
await updatePhaseObjectiveInBase44('phase-123', {
  objective: objective.objective,
});
```

#### System Status

```typescript
// Fetch system status for phase
const status = await fetchPhaseSystemStatus('phase-123');

// Update system map
await updateSystemMap('phase-123', {
  backend: 'operational',
  ui: 'operational',
  // ... other systems
});
```

#### Bug Impact

```typescript
// Fetch active bugs
const bugs = await fetchActiveBugs();

// Update bug impact for phase
await updateBugImpactOnPhase('phase-123', bugs);
```

#### Alignment Checklist

```typescript
// Fetch alignment checklist
const checklist = await fetchAlignmentChecklist();

// Update alignment checklist
await updateAlignmentChecklist({
  planAligned: true,
  systemMapAligned: true,
  bugImpactMapped: true,
  objectivesSynced: true,
  lastSyncTime: new Date().toISOString(),
});
```

## Base44 API Endpoints

The client assumes the following Base44 API endpoints exist:

- `GET /phase/current` - Get active phase
- `PUT /phase` - Update phase data
- `PUT /phase/{phaseId}/objective` - Update phase objective
- `GET /phase/{phaseId}/system-status` - Get system status
- `PUT /phase/{phaseId}/system-status` - Update system status
- `GET /bugs/active` - Get active bugs
- `PUT /phase/{phaseId}/bug-impact` - Update bug impact
- `GET /checklist/alignment` - Get alignment checklist
- `PUT /checklist/alignment` - Update alignment checklist

**Note**: These endpoints may need to be implemented in Base44 if they don't exist yet. The client will throw errors if endpoints are not available.

## Error Handling

The sync script includes error handling for:
- Missing API keys
- Network errors
- Invalid responses
- Missing phase data

Errors are logged with context, and the script will continue with other operations when possible.

## Integration with Cursor

The Base44 sync can be integrated into Cursor workflows:

1. **After Phase Changes**: Run sync when phases are updated
2. **Scheduled Sync**: Set up a cron job to sync periodically
3. **Manual Sync**: Run sync on-demand when needed

Example integration:

```typescript
import { syncBase44WithKairos } from './scripts/base44-sync';

// After updating a phase
await updatePhaseInFirestore(phaseId, status);
await syncBase44WithKairos({ phaseId, verbose: true });
```

## Troubleshooting

### "Base44 client is disabled"

Set `NODE_ENV` to something other than `test`, or explicitly enable the client:

```typescript
import { initBase44Client } from './src/lib/base44Client';
initBase44Client({ enabled: true });
```

### "Base44 API error (404)"

The Base44 API endpoint may not exist yet. Check:
1. Base44 API documentation
2. Whether the endpoint needs to be implemented
3. The `BASE44_API_URL` environment variable

### "Phase objective not found"

The phase ID may not exist in the Kairos active plan. Verify:
1. The phase ID is correct
2. The active plan includes this phase
3. The phase has an objective defined

## Future Enhancements

- [ ] Batch operations for multiple phases
- [ ] Webhook integration for real-time sync
- [ ] Conflict resolution strategies
- [ ] Sync history and audit logs
- [ ] Retry logic with exponential backoff
- [ ] Rate limiting support

