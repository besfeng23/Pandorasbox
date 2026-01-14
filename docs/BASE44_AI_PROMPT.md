# Base44 API Implementation Prompt

Copy and paste this prompt into Base44's chat AI to implement the required API endpoints for Cursor/Kairos synchronization.

---

## Prompt for Base44 Chat AI

```
I need you to implement a set of API endpoints in Base44 for synchronizing with Cursor and Kairos. These endpoints will allow external systems to fetch and update phase data, system status, bug impact, and alignment checklists.

### Required Endpoints

#### 1. Plan Alignment - Active Phase

**GET /phase/current**
- Returns the currently active phase
- Response (200 OK):
```json
{
  "phaseId": "phase-123",
  "status": "active",
  "objective": "Complete Phase 1 foundation",
  "systemStatus": {
    "backend": "operational",
    "ui": "operational",
    "database": "operational",
    "integrations": "operational"
  },
  "bugImpact": [],
  "createdAt": "2026-01-14T12:00:00Z",
  "updatedAt": "2026-01-14T16:00:00Z"
}
```

**PUT /phase**
- Updates phase data
- Request body:
```json
{
  "phaseId": "phase-123",
  "status": "active",
  "objective": "Updated objective",
  "systemStatus": { ... },
  "bugImpact": [ ... ]
}
```
- Response (200 OK): Returns updated phase object

#### 2. Master Plan Snapshot - Phase Objectives

**PUT /phase/{phaseId}/objective**
- Updates the objective for a specific phase
- Path parameter: `phaseId` (string)
- Request body:
```json
{
  "objective": "Complete Phase 1 foundation with all core features",
  "source": "kairos",
  "updatedAt": "2026-01-14T16:00:00Z"
}
```
- Response (200 OK): Returns updated phase object

#### 3. Phase ↔ System Map

**GET /phase/{phaseId}/system-status**
- Returns system status for a specific phase
- Path parameter: `phaseId` (string)
- Response (200 OK):
```json
{
  "backend": "operational",
  "ui": "operational",
  "database": "operational",
  "integrations": "operational",
  "lastChecked": "2026-01-14T16:00:00Z"
}
```

**PUT /phase/{phaseId}/system-status**
- Updates system status for a phase
- Path parameter: `phaseId` (string)
- Request body:
```json
{
  "backend": "operational",
  "ui": "degraded",
  "database": "operational",
  "integrations": "operational"
}
```
- Response (200 OK): Returns updated system status

#### 4. Bug Impact Map & Evidence

**GET /bugs/active**
- Returns all active bugs
- Response (200 OK):
```json
[
  {
    "bugId": "bug-001",
    "phaseId": "phase-123",
    "severity": "high",
    "affectedSystems": ["backend", "ui"],
    "evidence": ["error-log-1", "user-report-2"],
    "status": "open",
    "createdAt": "2026-01-14T10:00:00Z"
  }
]
```

**PUT /phase/{phaseId}/bug-impact**
- Maps bugs to a specific phase
- Path parameter: `phaseId` (string)
- Request body:
```json
[
  {
    "bugId": "bug-001",
    "phaseId": "phase-123",
    "severity": "high",
    "affectedSystems": ["backend"],
    "evidence": ["error-log-1"]
  }
]
```
- Response (200 OK): Returns updated bug impact array

#### 5. Alignment Checklist

**GET /checklist/alignment**
- Returns the current alignment checklist status
- Response (200 OK):
```json
{
  "planAligned": true,
  "systemMapAligned": true,
  "bugImpactMapped": true,
  "objectivesSynced": true,
  "lastSyncTime": "2026-01-14T16:00:00Z",
  "lastUpdated": "2026-01-14T16:00:00Z"
}
```

**PUT /checklist/alignment**
- Updates the alignment checklist
- Request body:
```json
{
  "planAligned": true,
  "systemMapAligned": true,
  "bugImpactMapped": true,
  "objectivesSynced": true,
  "lastSyncTime": "2026-01-14T16:00:00Z"
}
```
- Response (200 OK): Returns updated checklist

### Authentication

All endpoints should:
- Accept `api_key` header for authentication
- Return 401 Unauthorized if API key is missing or invalid
- Support optional Bearer token authentication as fallback

### Error Responses

All endpoints should return standard error responses:

**400 Bad Request:**
```json
{
  "error": "Invalid request body",
  "details": "..."
}
```

**401 Unauthorized:**
```json
{
  "error": "Authentication required",
  "message": "Missing or invalid API key"
}
```

**404 Not Found:**
```json
{
  "error": "Resource not found",
  "message": "Phase with ID 'phase-123' not found"
}
```

**500 Internal Server Error:**
```json
{
  "error": "Internal server error",
  "message": "..."
}
```

### Data Storage

Please store data in a way that:
- Supports querying by phaseId
- Tracks timestamps (createdAt, updatedAt, lastSyncTime)
- Allows efficient lookups for active phases
- Maintains data integrity

### Implementation Notes

1. Use Base44's existing database/storage system
2. Implement proper validation for all request bodies
3. Add logging for API calls (without exposing sensitive data)
4. Ensure idempotency where appropriate (PUT operations)
5. Handle concurrent updates gracefully
6. Return meaningful error messages

### Testing

After implementation, the endpoints should be testable with:
- curl commands
- Postman/Insomnia
- The Cursor sync script (npm run base44:sync)

Please implement these endpoints and let me know when they're ready for testing.
```

---

## Additional Context (Optional)

If Base44's AI needs more context, you can also share:

1. **Current Base44 Structure**: What database/storage system Base44 uses
2. **Existing API Patterns**: How other Base44 endpoints are structured
3. **Authentication System**: How Base44 currently handles API keys
4. **Data Models**: Existing phase/bug/system models in Base44

## Testing After Implementation

Once Base44 implements these endpoints, test them with:

```bash
# Set your API key
export BASE44_API_KEY=your_key_here
export BASE44_API_URL=https://kairostrack.base44.app

# Test sync
npm run base44:sync:dry-run
```

