# Kairos Event Alignment Check

## Active Plan EventMappings

Extracted from `kairos_masterplan_v2` masterplan JSON:

### Event Types with Required Fields

| Event Type | Required Fields | Node IDs | Proof Event? |
|------------|----------------|----------|--------------|
| `ui.chat.message_sent` | `threadId`, `messageId` | PB-CORE-CHAT-001 | ❌ (Informational) |
| `system.chat.response_completed` | `threadId`, `assistantMessageId` | PB-CORE-CHAT-001 | ✅ (Proof) |
| `system.ratelimit.triggered` | `limitType` | PB-CORE-CHAT-001, PB-OPS-RATE-001 | ❌ (Informational) |
| `system.error.logged` | `code` | PB-CORE-CHAT-001, PB-LANES-ORCH-001, PB-OPS-AGENTS-001, PB-OPS-LOGS-001 | ❌ (Informational) |
| `ui.thread.created` | `threadId` | PB-CORE-THREADS-001 | ❌ (Informational) |
| `system.thread.summary_generated` | `threadId` | PB-CORE-THREADS-001 | ✅ (Proof) |
| `system.thread.persisted` | `threadId` | PB-DATA-THREAD-001 | ✅ (Proof) |
| `system.thread.updated` | `threadId`, `title` | PB-DATA-THREAD-001 | ❌ (Informational) |
| `ui.memory.search` | `query` | PB-CORE-MEMORY-001 | ❌ (Informational) |
| `system.memory.index_updated` | `userId` | PB-CORE-MEMORY-001 | ✅ (Proof) |
| `system.clear_memory.completed` | `userId` | PB-CORE-MEMORY-001, PB-CORE-SETTINGS-001, PB-OPS-EXPORT-001 | ✅ (Proof) |
| `system.lane.memory.created` | `memoryId` | PB-LANES-MEM-001 | ❌ (Informational) |
| `system.memory.persisted` | `memoryId` | PB-LANES-MEM-001, PB-DATA-MEM-001 | ✅ (Proof) |
| `system.memory.updated` | `memoryId` | PB-DATA-MEM-001 | ❌ (Informational) |
| `system.artifact.extracted` | `artifactId`, `messageId` | PB-CORE-ARTIFACTS-001, PB-LANES-ANS-001 | ✅ (Proof) |
| `system.artifact.persisted` | `artifactId` | PB-CORE-ARTIFACTS-001, PB-DATA-ART-001 | ✅ (Proof) |
| `system.artifact.updated` | `artifactId`, `version` | PB-DATA-ART-001 | ❌ (Informational) |
| `ui.kb.upload_started` | `filename` | PB-CORE-KB-001 | ❌ (Informational) |
| `system.kb.upload_completed` | `chunkCount` | PB-CORE-KB-001 | ✅ (Proof) |
| `ui.settings.updated` | `userId` | PB-CORE-SETTINGS-001 | ❌ (Informational) |
| `system.export.completed` | `userId`, `bytes` | PB-CORE-SETTINGS-001, PB-OPS-EXPORT-001 | ✅ (Proof) |
| `ui.graph.opened` | `userId` | PB-CORE-GRAPH-001 | ❌ (Informational) |
| `system.graph.render_ok` | `nodeCount` | PB-CORE-GRAPH-001 | ✅ (Proof) |
| `system.graph.persisted` | `nodeCount`, `edgeCount` | PB-DATA-GRAPH-001 | ✅ (Proof) |
| `system.graph.analysis_complete` | `metric` | PB-DATA-GRAPH-001 | ❌ (Informational) |
| `system.phase.updated` | `phaseId`, `status` | PB-DASH-PANDORAUI-001, PB-DATA-PHASE-001 | ❌ (Informational) |
| `system.phase.all_completed` | `count` | PB-DASH-PANDORAUI-001 | ✅ (Proof) |
| `system.phase.persisted` | `phaseId` | PB-DATA-PHASE-001 | ✅ (Proof) |
| `system.lane.chat.started` | `threadId`, `messageId` | PB-LANES-ORCH-001 | ❌ (Informational) |
| `system.lane.chat.completed` | `assistantMessageId` | PB-LANES-ORCH-001 | ✅ (Proof) |
| `system.lane.answer.retrieval_done` | `resultCount` | PB-LANES-ANS-001 | ❌ (Informational) |
| `system.lane.answer.completed` | `assistantMessageId` | PB-LANES-ANS-001 | ✅ (Proof) |
| `system.search.completed` | `query`, `latencyMs` | PB-CORE-SEARCH-001 | ✅ (Proof) |
| `system.embedding.generated` | `entityType`, `entityId` | PB-CORE-SEARCH-001, PB-OPS-EMBED-001 | ✅ (Proof) |
| `system.embedding.failed` | `entityType`, `entityId` | PB-OPS-EMBED-001 | ❌ (Informational) |
| `system.message.persisted` | `messageId`, `role` | PB-DATA-MSG-001 | ✅ (Proof) |
| `system.message.updated` | `messageId`, `status` | PB-DATA-MSG-001 | ❌ (Informational) |
| `system.mcp.tool_called` | `toolName` | PB-INTEG-MCP-001 | ✅ (Proof) |
| `system.actions.request_ok` | `endpoint` | PB-INTEG-ACTIONS-001 | ✅ (Proof) |
| `system.cron.executed` | `jobName`, `success` | PB-OPS-CRON-001 | ✅ (Proof) |
| `system.agent.completed` | `agentName`, `userId` | PB-OPS-AGENTS-001 | ✅ (Proof) |
| `system.auth.login_success` | `userId` | PB-SEC-AUTH-001 | ✅ (Proof) |
| `system.auth.login_failure` | `errorCode` | PB-SEC-AUTH-001 | ❌ (Informational) |
| `system.security.rules_verified` | `testSuiteId` | PB-SEC-RULES-001 | ✅ (Proof) |
| `system.security.violation` | `ruleId` | PB-SEC-RULES-001 | ❌ (Informational) |
| `system.apikey.generated` | `userId` | PB-SEC-APIKEY-001 | ✅ (Proof) |
| `system.apikey.revoked` | `userId` | PB-SEC-APIKEY-001 | ✅ (Proof) |
| `system.ratelimit.cleared` | `limitType` | PB-OPS-RATE-001 | ❌ (Informational) |
| `ui.copy.audit_passed` | `screenCount` | PB-COPY-CONTENT-001 | ✅ (Proof) |
| `ui.copy.updated` | `componentId` | PB-COPY-CONTENT-001 | ❌ (Informational) |

## Alignment Status

✅ **All event types match** between emitter and masterplan  
✅ **Required fields match** for all event types  
✅ **Proof vs informational distinction** implemented  
✅ **Gateway format compatibility** added  

## Next Steps

1. **Run simulation**: `npm run kairos:simulate`
2. **Verify in Kairos**: Check Live Activity for events
3. **Check task state**: Verify at least one task_state changes
4. **Monitor rollups**: Ensure Base44 recomputes progress

## Gateway Endpoint

**Preferred**: Use `KAIROS_EVENT_GATEWAY_URL` (Cloud Run service)
- Endpoint: `https://kairos-event-gateway-xxx.run.app/v1/event`
- Auth: IAM (GoogleAuth)
- Format: Gateway-compatible (action, source, dedupeKey, metadata)

**Fallback**: Direct Base44
- Endpoint: `https://kairostrack.base44.app/functions/ingest`
- Auth: HMAC signature (X-Signature header)
- Format: Event payload with signature

