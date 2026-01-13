/**
 * Extract eventMappings from masterplan JSON
 * 
 * This script extracts the eventMappings from the masterplan JSON
 * and outputs them in a format that can be used for validation.
 */

import fs from 'fs';
import path from 'path';

const REPO_ROOT = process.cwd();
const MASTERPLAN_JSON = `{
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
          },
          {
            "type": "system.ratelimit.triggered",
            "payloadMatch": ["limitType"],
            "updates": { "status": "blocked", "progressDelta": 0.0 }
          },
          {
            "type": "system.error.logged",
            "payloadMatch": ["code"],
            "updates": { "status": "error", "progressDelta": 0.0 }
          }
        ]
      },
      {
        "nodeId": "PB-CORE-THREADS-001",
        "eventMappings": [
          {
            "type": "ui.thread.created",
            "payloadMatch": ["threadId"],
            "updates": { "status": "done", "progress": 1.0 }
          },
          {
            "type": "system.thread.summary_generated",
            "payloadMatch": ["threadId"],
            "updates": { "status": "done", "progressDelta": 0.3 }
          }
        ]
      },
      {
        "nodeId": "PB-CORE-MEMORY-001",
        "eventMappings": [
          {
            "type": "ui.memory.search",
            "payloadMatch": ["query"],
            "updates": { "status": "in_progress", "progressDelta": 0.2 }
          },
          {
            "type": "system.memory.index_updated",
            "payloadMatch": ["userId"],
            "updates": { "status": "done", "progress": 1.0 }
          },
          {
            "type": "system.clear_memory.completed",
            "payloadMatch": ["userId"],
            "updates": { "status": "done", "progress": 1.0 }
          }
        ]
      },
      {
        "nodeId": "PB-CORE-ARTIFACTS-001",
        "eventMappings": [
          {
            "type": "system.artifact.extracted",
            "payloadMatch": ["artifactId", "messageId"],
            "updates": { "status": "done", "progress": 1.0 }
          },
          {
            "type": "system.artifact.persisted",
            "payloadMatch": ["artifactId"],
            "updates": { "status": "done", "progressDelta": 0.2 }
          }
        ]
      },
      {
        "nodeId": "PB-CORE-KB-001",
        "eventMappings": [
          {
            "type": "ui.kb.upload_started",
            "payloadMatch": ["filename"],
            "updates": { "status": "in_progress", "progressDelta": 0.2 }
          },
          {
            "type": "system.kb.upload_completed",
            "payloadMatch": ["chunkCount"],
            "updates": { "status": "done", "progress": 1.0 }
          }
        ]
      },
      {
        "nodeId": "PB-CORE-SETTINGS-001",
        "eventMappings": [
          {
            "type": "ui.settings.updated",
            "payloadMatch": ["userId"],
            "updates": { "status": "done", "progress": 1.0 }
          },
          {
            "type": "system.export.completed",
            "payloadMatch": ["userId", "bytes"],
            "updates": { "status": "done", "progress": 1.0 }
          },
          {
            "type": "system.clear_memory.completed",
            "payloadMatch": ["userId"],
            "updates": { "status": "done", "progress": 1.0 }
          }
        ]
      },
      {
        "nodeId": "PB-CORE-GRAPH-001",
        "eventMappings": [
          {
            "type": "ui.graph.opened",
            "payloadMatch": ["userId"],
            "updates": { "status": "in_progress", "progressDelta": 0.2 }
          },
          {
            "type": "system.graph.render_ok",
            "payloadMatch": ["nodeCount"],
            "updates": { "status": "done", "progress": 1.0 }
          }
        ]
      },
      {
        "nodeId": "PB-DASH-PANDORAUI-001",
        "eventMappings": [
          {
            "type": "system.phase.updated",
            "payloadMatch": ["phaseId", "status"],
            "updates": { "status": "in_progress", "progressDelta": 0.05 }
          },
          {
            "type": "system.phase.all_completed",
            "payloadMatch": ["count"],
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
          },
          {
            "type": "system.error.logged",
            "payloadMatch": ["code", "threadId", "messageId"],
            "updates": { "status": "error", "progressDelta": 0.0 }
          }
        ]
      },
      {
        "nodeId": "PB-LANES-MEM-001",
        "eventMappings": [
          {
            "type": "system.lane.memory.created",
            "payloadMatch": ["memoryId"],
            "updates": { "status": "done", "progressDelta": 0.5 }
          },
          {
            "type": "system.memory.persisted",
            "payloadMatch": ["memoryId"],
            "updates": { "status": "done", "progressDelta": 0.2 }
          }
        ]
      },
      {
        "nodeId": "PB-LANES-ANS-001",
        "eventMappings": [
          {
            "type": "system.lane.answer.retrieval_done",
            "payloadMatch": ["resultCount"],
            "updates": { "status": "in_progress", "progressDelta": 0.3 }
          },
          {
            "type": "system.lane.answer.completed",
            "payloadMatch": ["assistantMessageId"],
            "updates": { "status": "done", "progress": 1.0 }
          },
          {
            "type": "system.artifact.extracted",
            "payloadMatch": ["artifactId", "messageId"],
            "updates": { "status": "done", "progressDelta": 0.1 }
          }
        ]
      },
      {
        "nodeId": "PB-CORE-SEARCH-001",
        "eventMappings": [
          {
            "type": "system.search.completed",
            "payloadMatch": ["query", "latencyMs"],
            "updates": { "status": "done", "progress": 1.0 }
          },
          {
            "type": "system.embedding.generated",
            "payloadMatch": ["entityType", "entityId"],
            "updates": { "status": "done", "progressDelta": 0.1 }
          }
        ]
      },
      {
        "nodeId": "PB-INTEG-MCP-001",
        "eventMappings": [
          {
            "type": "system.mcp.tool_called",
            "payloadMatch": ["toolName"],
            "updates": { "status": "done", "progressDelta": 0.25 }
          },
          {
            "type": "system.mcp.tool_called",
            "payloadMatch": ["toolName", "error"],
            "updates": { "status": "error", "progressDelta": 0.0 }
          }
        ]
      },
      {
        "nodeId": "PB-INTEG-ACTIONS-001",
        "eventMappings": [
          {
            "type": "system.actions.request_ok",
            "payloadMatch": ["endpoint"],
            "updates": { "status": "done", "progressDelta": 0.2 }
          },
          {
            "type": "system.actions.request_ok",
            "payloadMatch": ["endpoint", "error"],
            "updates": { "status": "error", "progressDelta": 0.0 }
          }
        ]
      },
      {
        "nodeId": "PB-OPS-CRON-001",
        "eventMappings": [
          {
            "type": "system.cron.executed",
            "payloadMatch": ["jobName", "success"],
            "updates": { "status": "done", "progressDelta": 0.15 }
          },
          {
            "type": "system.cron.executed",
            "payloadMatch": ["jobName", "success", "false"],
            "updates": { "status": "error", "progressDelta": 0.0 }
          }
        ]
      },
      {
        "nodeId": "PB-OPS-AGENTS-001",
        "eventMappings": [
          {
            "type": "system.agent.completed",
            "payloadMatch": ["agentName", "userId"],
            "updates": { "status": "done", "progressDelta": 0.25 }
          },
          {
            "type": "system.error.logged",
            "payloadMatch": ["agentName", "error"],
            "updates": { "status": "error", "progressDelta": 0.0 }
          }
        ]
      },
      {
        "nodeId": "PB-SEC-AUTH-001",
        "eventMappings": [
          {
            "type": "system.auth.login_success",
            "payloadMatch": ["userId"],
            "updates": { "status": "done", "progress": 1.0 }
          },
          {
            "type": "system.auth.login_failure",
            "payloadMatch": ["errorCode"],
            "updates": { "status": "in_progress", "progressDelta": 0.0 }
          }
        ]
      },
      {
        "nodeId": "PB-SEC-RULES-001",
        "eventMappings": [
          {
            "type": "system.security.rules_verified",
            "payloadMatch": ["testSuiteId"],
            "updates": { "status": "done", "progress": 1.0 }
          },
          {
            "type": "system.security.violation",
            "payloadMatch": ["ruleId"],
            "updates": { "status": "blocked", "progressDelta": 0.0 }
          }
        ]
      },
      {
        "nodeId": "PB-SEC-APIKEY-001",
        "eventMappings": [
          {
            "type": "system.apikey.generated",
            "payloadMatch": ["userId"],
            "updates": { "status": "done", "progress": 1.0 }
          },
          {
            "type": "system.apikey.revoked",
            "payloadMatch": ["userId"],
            "updates": { "status": "done", "progressDelta": 0.5 }
          }
        ]
      },
      {
        "nodeId": "PB-OPS-RATE-001",
        "eventMappings": [
          {
            "type": "system.ratelimit.triggered",
            "payloadMatch": ["limitType"],
            "updates": { "status": "blocked", "progressDelta": 0.0 }
          },
          {
            "type": "system.ratelimit.cleared",
            "payloadMatch": ["limitType"],
            "updates": { "status": "in_progress", "progressDelta": 0.0 }
          }
        ]
      },
      {
        "nodeId": "PB-OPS-EMBED-001",
        "eventMappings": [
          {
            "type": "system.embedding.generated",
            "payloadMatch": ["entityType", "entityId"],
            "updates": { "status": "done", "progressDelta": 0.1 }
          },
          {
            "type": "system.embedding.failed",
            "payloadMatch": ["entityType", "entityId"],
            "updates": { "status": "in_progress", "progressDelta": 0.0 }
          }
        ]
      },
      {
        "nodeId": "PB-OPS-EXPORT-001",
        "eventMappings": [
          {
            "type": "system.export.completed",
            "payloadMatch": ["userId", "bytes"],
            "updates": { "status": "done", "progress": 1.0 }
          },
          {
            "type": "system.clear_memory.completed",
            "payloadMatch": ["userId"],
            "updates": { "status": "done", "progress": 1.0 }
          }
        ]
      },
      {
        "nodeId": "PB-OPS-LOGS-001",
        "eventMappings": [
          {
            "type": "system.error.logged",
            "payloadMatch": ["severity", "code"],
            "updates": { "status": "in_progress", "progressDelta": 0.0 }
          },
          {
            "type": "system.error.logged",
            "payloadMatch": ["severity", "code", "resolved"],
            "updates": { "status": "done", "progressDelta": 0.0 }
          }
        ]
      },
      {
        "nodeId": "PB-DATA-MSG-001",
        "eventMappings": [
          {
            "type": "system.message.persisted",
            "payloadMatch": ["messageId", "role"],
            "updates": { "status": "done", "progressDelta": 0.1 }
          },
          {
            "type": "system.message.updated",
            "payloadMatch": ["messageId", "status"],
            "updates": { "status": "in_progress", "progressDelta": 0.0 }
          }
        ]
      },
      {
        "nodeId": "PB-DATA-THREAD-001",
        "eventMappings": [
          {
            "type": "system.thread.persisted",
            "payloadMatch": ["threadId"],
            "updates": { "status": "done", "progressDelta": 0.2 }
          },
          {
            "type": "system.thread.updated",
            "payloadMatch": ["threadId", "title"],
            "updates": { "status": "in_progress", "progressDelta": 0.1 }
          }
        ]
      },
      {
        "nodeId": "PB-DATA-MEM-001",
        "eventMappings": [
          {
            "type": "system.memory.persisted",
            "payloadMatch": ["memoryId"],
            "updates": { "status": "done", "progressDelta": 0.2 }
          },
          {
            "type": "system.memory.updated",
            "payloadMatch": ["memoryId"],
            "updates": { "status": "in_progress", "progressDelta": 0.1 }
          }
        ]
      },
      {
        "nodeId": "PB-DATA-ART-001",
        "eventMappings": [
          {
            "type": "system.artifact.persisted",
            "payloadMatch": ["artifactId"],
            "updates": { "status": "done", "progressDelta": 0.2 }
          },
          {
            "type": "system.artifact.updated",
            "payloadMatch": ["artifactId", "version"],
            "updates": { "status": "in_progress", "progressDelta": 0.1 }
          }
        ]
      },
      {
        "nodeId": "PB-DATA-GRAPH-001",
        "eventMappings": [
          {
            "type": "system.graph.persisted",
            "payloadMatch": ["nodeCount", "edgeCount"],
            "updates": { "status": "done", "progress": 1.0 }
          },
          {
            "type": "system.graph.analysis_complete",
            "payloadMatch": ["metric"],
            "updates": { "status": "in_progress", "progressDelta": 0.05 }
          }
        ]
      },
      {
        "nodeId": "PB-DATA-PHASE-001",
        "eventMappings": [
          {
            "type": "system.phase.persisted",
            "payloadMatch": ["phaseId"],
            "updates": { "status": "done", "progressDelta": 0.05 }
          },
          {
            "type": "system.phase.updated",
            "payloadMatch": ["phaseId", "status"],
            "updates": { "status": "in_progress", "progressDelta": 0.0 }
          }
        ]
      },
      {
        "nodeId": "PB-COPY-CONTENT-001",
        "eventMappings": [
          {
            "type": "ui.copy.audit_passed",
            "payloadMatch": ["screenCount"],
            "updates": { "status": "done", "progress": 1.0 }
          },
          {
            "type": "ui.copy.updated",
            "payloadMatch": ["componentId"],
            "updates": { "status": "in_progress", "progressDelta": 0.1 }
          }
        ]
      }
    ]
  }
}`;

// Extract and print eventMappings
const masterplan = JSON.parse(MASTERPLAN_JSON);
const allEventMappings: Array<{
  type: string;
  payloadMatch: string[];
  updates?: Record<string, any>;
  nodeId: string;
}> = [];

masterplan.masterPlan.nodes.forEach((node: any) => {
  const mappings = node.eventMappings || node.event_mappings || [];
  mappings.forEach((mapping: any) => {
    allEventMappings.push({
      ...mapping,
      nodeId: node.nodeId,
    });
  });
});

// Group by type
const byType: Record<string, Array<{ payloadMatch: string[]; nodeId: string }>> = {};
allEventMappings.forEach(m => {
  if (!byType[m.type]) {
    byType[m.type] = [];
  }
  byType[m.type].push({
    payloadMatch: m.payloadMatch,
    nodeId: m.nodeId,
  });
});

console.log('📊 Event Mappings Summary:');
console.log(`Total unique event types: ${Object.keys(byType).length}`);
console.log(`Total mappings: ${allEventMappings.length}`);
console.log('');

console.log('📋 Event Types with Required Fields:');
Object.entries(byType).forEach(([type, mappings]) => {
  // Get union of all required fields for this type
  const allFields = new Set<string>();
  mappings.forEach(m => m.payloadMatch.forEach(f => allFields.add(f)));
  
  console.log(`\n${type}:`);
  console.log(`  Required fields: [${Array.from(allFields).join(', ')}]`);
  console.log(`  Used in nodes: ${mappings.map(m => m.nodeId).join(', ')}`);
});

console.log('\n✅ Extraction complete');

