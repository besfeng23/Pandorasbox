/**
 * Sample Track A masterplan payload (repo-side)
 *
 * This is used for:
 * - local validation scripts
 * - e2e smoke testing against Base44 `kairosRegisterPlan`
 *
 * NOTE: This is intentionally a small-but-realistic masterplan shape:
 * `{ masterPlan: { version, nodes: [{ nodeId, eventMappings: [...] }, ...] } }`
 */

export const SAMPLE_MASTERPLAN_JSON = `{
  "masterPlan": {
    "version": "pb.prd.v2.0.generated.2026-01-13",
    "nodes": [
      {
        "nodeId": "PB-CORE-CHAT-001",
        "eventMappings": [
          {
            "type": "ui.chat.message_sent",
            "payloadMatch": ["threadId", "messageId"],
            "updates": { "status": "in_progress", "progressDelta": 0.2 }
          },
          {
            "type": "system.chat.response_completed",
            "payloadMatch": ["threadId", "assistantMessageId"],
            "updates": { "status": "done", "progress": 1.0 }
          }
        ]
      },
      {
        "nodeId": "PB-LANES-ORCH-001",
        "eventMappings": [
          {
            "type": "system.lane.chat.started",
            "payloadMatch": ["threadId", "messageId"],
            "updates": { "status": "in_progress", "progressDelta": 0.2 }
          },
          {
            "type": "system.lane.chat.completed",
            "payloadMatch": ["assistantMessageId"],
            "updates": { "status": "done", "progress": 1.0 }
          }
        ]
      },
      {
        "nodeId": "PB-CORE-MEMORY-001",
        "eventMappings": [
          {
            "type": "system.memory.index_updated",
            "payloadMatch": ["userId"],
            "updates": { "status": "done", "progress": 1.0 }
          }
        ]
      }
    ]
  }
}`;

export const SAMPLE_MASTERPLAN = JSON.parse(SAMPLE_MASTERPLAN_JSON) as {
  masterPlan: { version: string; nodes: Array<{ nodeId: string; eventMappings?: unknown[]; event_mappings?: unknown[] }> };
};


