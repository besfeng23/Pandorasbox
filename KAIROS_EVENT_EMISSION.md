# Kairos Event Emission System

## Overview

Pandora's Box emits deterministic events to Kairos that map to tasks/milestones in the active plan. Events include proof/evidence fields required by `proof_requirements` so Kairos can mark tasks "done" automatically.

## Track A: Masterplan Events

This is the primary event emission system for the masterplan (Track A). See event types and emission points below.

## Track B: Stabilization Sprint

Stabilization Sprint (Track B) is a separate gating overlay that blocks nodes until bugs are fixed. It does NOT complete tasks - it only adds blocking rules.

**Contract File**: `contracts/kairos/stabilization_sprint_plan.json`

**Registration**: `npm run kairos:register:stabilization`

See `BASE44_STABILIZATION_SPEC.md` for Base44 implementation requirements.

## Architecture

```
┌─────────────────┐
│ Pandora's Box  │
│   Application   │
└────────┬────────┘
         │
         │ sendKairosEvent()
         ▼
┌─────────────────┐
│ kairosClient.ts │
│  (Event Client) │
└────────┬────────┘
         │
         │ HTTP POST
         ▼
┌─────────────────┐         ┌──────────────┐
│ Event Gateway   │────────►│ Base44 Kairos│
│ (Cloud Run)     │  HMAC   │   Ingest API │
└─────────────────┘  Signed └──────────────┘
```

## Configuration

### Environment Variables

```bash
# Required: Base URL for Kairos API or Event Gateway
KAIROS_BASE_URL=https://kairostrack.base44.app
# OR
KAIROS_EVENT_GATEWAY_URL=https://kairos-event-gateway-xxx.run.app

# Optional: API key for authentication
KAIROS_INGEST_KEY=your_api_key_here

# Optional: Secret for HMAC signing
KAIROS_SIGNING_SECRET=your_signing_secret_here
```

### Initialization

The client initializes automatically on module load (server-side only). To configure manually:

```typescript
import { initKairosClient } from '@/lib/kairosClient';

initKairosClient({
  baseUrl: 'https://kairostrack.base44.app',
  ingestKey: 'your_key',
  enabled: true,
});
```

## Event Types

All event types are strictly defined from `kairos_masterplan_v2.eventMappings`. See `src/lib/kairosClient.ts` for the complete list.

### UI Events
- `ui.chat.message_sent` - User sends a message
- `ui.thread.created` - New thread created
- `ui.memory.search` - Memory search performed
- `ui.kb.upload_started` - Knowledge base upload started
- `ui.settings.updated` - Settings changed
- `ui.graph.opened` - Graph view opened

### System Events
- `system.chat.response_completed` - AI response completed
- `system.lane.chat.started` - Chat lane orchestrator started
- `system.lane.chat.completed` - Chat lane orchestrator completed
- `system.lane.memory.created` - Memory created in memory lane
- `system.lane.answer.retrieval_done` - Context retrieval completed
- `system.lane.answer.completed` - Answer generation completed
- `system.memory.persisted` - Memory saved to Firestore
- `system.message.persisted` - Message saved to Firestore
- `system.thread.persisted` - Thread saved to Firestore
- `system.thread.updated` - Thread updated
- `system.thread.summary_generated` - Thread summary generated
- `system.embedding.generated` - Embedding generated
- `system.search.completed` - Vector search completed
- `system.ratelimit.triggered` - Rate limit exceeded
- `system.error.logged` - Error occurred

## Usage

### Basic Event Emission

```typescript
import { sendKairosEvent } from '@/lib/kairosClient';

// Emit a simple event
await sendKairosEvent('ui.chat.message_sent', {
  threadId: 'thread_123',
  messageId: 'msg_456',
  userId: 'user_789',
});
```

### With Correlation ID

```typescript
await sendKairosEvent(
  'system.lane.chat.started',
  {
    threadId: 'thread_123',
    messageId: 'msg_456',
    userId: 'user_789',
  },
  {
    correlationId: 'thread_123', // Groups related events
  }
);
```

### Batch Events

```typescript
import { sendKairosEvents } from '@/lib/kairosClient';

await sendKairosEvents([
  {
    eventType: 'ui.chat.message_sent',
    payload: { threadId: 't1', messageId: 'm1' },
  },
  {
    eventType: 'system.message.persisted',
    payload: { messageId: 'm1', role: 'user' },
  },
]);
```

## Event Emission Points

Events are automatically emitted at key proof points:

### Chat Flow
- **Message Sent**: `src/app/actions/chat.ts` - `submitUserMessage()`
- **Thread Created**: `src/app/actions/chat.ts` - `createThread()`
- **Thread Updated**: `src/app/actions/chat.ts` - `updateThread()`
- **Thread Summary**: `src/app/actions/chat.ts` - `summarizeThread()`
- **Rate Limit**: `src/app/actions/chat.ts` - `checkRateLimit()`

### Chat Lane
- **Lane Started**: `src/ai/flows/run-chat-lane.ts` - `runChatLane()`
- **Lane Completed**: `src/ai/flows/run-chat-lane.ts` - After `runAnswerLane()`
- **Response Completed**: `src/ai/flows/run-chat-lane.ts` - After answer generation

### Answer Lane
- **Retrieval Done**: `src/ai/flows/run-answer-lane.ts` - After vector search
- **Answer Completed**: `src/ai/flows/run-answer-lane.ts` - After response generation

### Memory Lane
- **Memory Created**: `src/lib/memory-utils.ts` - `saveMemory()`, `saveMemoriesBatch()`
- **Memory Persisted**: `src/lib/memory-utils.ts` - After Firestore write

## Required Fields

Each event type has required fields defined in `REQUIRED_FIELDS` in `kairosClient.ts`. The client validates these before sending.

Example:
- `ui.chat.message_sent` requires: `threadId`, `messageId`
- `system.lane.chat.completed` requires: `assistantMessageId`
- `system.memory.persisted` requires: `memoryId`

## Event Payload Structure

```typescript
{
  event_id: string;           // UUID
  event_time: string;         // ISO 8601 timestamp
  event_type: KairosEventType;
  source: 'pandorasbox';
  correlation_id?: string;    // Groups related events
  dedupe_key?: string;        // Prevents duplicate events
  payload: {
    // Event-specific fields (must include required fields)
    threadId?: string;
    messageId?: string;
    userId?: string;
    // ... other fields
  };
}
```

## Deduplication

Events are automatically deduplicated using `dedupe_key`:
- Format: `eventType:correlationId:commitSha:taskId:primaryId`
- Example: `ui.chat.message_sent:thread_123:abc123:task_456:msg_789`

## Retry Logic

The client implements exponential backoff retry:
- Max retries: 3 (configurable)
- Backoff: 100ms, 200ms, 400ms
- No retry on 4xx client errors

## Error Handling

Events are sent asynchronously and failures are logged but don't block application flow:

```typescript
sendKairosEvent('ui.chat.message_sent', payload)
  .catch(err => console.warn('Failed to emit event:', err));
```

## Testing

### Simulation Script

Run the simulation script to test event emission:

```bash
npm run kairos:simulate
```

This will:
1. Generate sample events for key workflows
2. Send them to Kairos
3. Print curl commands for manual testing
4. Report success/failure counts

### Manual Testing

Use the curl commands printed by the simulation script:

```bash
curl -X POST https://kairos-event-gateway-xxx.run.app/v1/event \
  -H 'Content-Type: application/json' \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -d '{
    "event_id": "test_123",
    "event_time": "2025-01-13T12:00:00Z",
    "event_type": "ui.chat.message_sent",
    "source": "pandorasbox",
    "payload": {
      "threadId": "thread_123",
      "messageId": "msg_456"
    }
  }'
```

## Verification Steps

1. **Run simulation script**:
   ```bash
   npm run kairos:simulate
   ```

2. **Check Kairos Live Activity**:
   - Navigate to Kairos dashboard
   - Verify events appear in Live Activity feed
   - Confirm events are accepted (HTTP 200)

3. **Verify task state changes**:
   - Check that at least one task_state changes in Kairos
   - Confirm tasks are marked "done" when proof requirements are met

4. **Monitor event log**:
   - Review event log for successful emissions
   - Check for any validation errors

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/ci.yml`:

```yaml
- name: Emit test completion event
  run: |
    npm run kairos:simulate
  env:
    KAIROS_EVENT_GATEWAY_URL: ${{ secrets.KAIROS_EVENT_GATEWAY_URL }}
    GOOGLE_ID_TOKEN: ${{ secrets.GOOGLE_ID_TOKEN }}
```

### After Deployment

Emit deployment success event:

```typescript
import { sendKairosEvent } from '@/lib/kairosClient';

await sendKairosEvent('deploy.succeeded', {
  deploy_id: process.env.DEPLOY_ID,
  env: 'production',
  commit_sha: process.env.COMMIT_SHA,
  url: 'https://your-app.com',
});
```

## Troubleshooting

### Events Not Appearing in Kairos

1. **Check environment variables**:
   ```bash
   echo $KAIROS_BASE_URL
   echo $KAIROS_EVENT_GATEWAY_URL
   ```

2. **Verify authentication**:
   - Gateway: Ensure IAM access is granted
   - Direct API: Check `KAIROS_INGEST_KEY`

3. **Check logs**:
   - Look for `[Kairos]` prefixed log messages
   - Check for validation errors (missing required fields)

4. **Test with simulation script**:
   ```bash
   npm run kairos:simulate
   ```

### Validation Errors

If events fail validation:
- Check `REQUIRED_FIELDS` in `kairosClient.ts`
- Ensure all required fields are present in payload
- Review error message for missing fields

### Network Errors

- Check network connectivity
- Verify endpoint URL is correct
- Check firewall/proxy settings
- Review retry logs for transient failures

## Files Changed

- `src/lib/kairosClient.ts` - Event client module
- `scripts/kairos-simulate.ts` - Simulation script
- `src/app/actions/chat.ts` - Chat event emissions
- `src/ai/flows/run-chat-lane.ts` - Lane event emissions
- `src/ai/flows/run-answer-lane.ts` - Answer lane events
- `src/lib/memory-utils.ts` - Memory event emissions
- `package.json` - Added `kairos:simulate` script

## Next Steps

1. **Add more event types** as needed (must match masterplan)
2. **Add CI hooks** for automated event emission
3. **Monitor event delivery** in production
4. **Tune retry logic** based on network conditions
5. **Add event batching** for high-volume scenarios

## References

- Kairos Masterplan: `tesy` (PRD file contains masterplan JSON)
- Event Gateway: `services/kairos-event-gateway/`
- Base44 API: `https://kairostrack.base44.app`

