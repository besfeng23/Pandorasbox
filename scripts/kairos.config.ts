/**
 * Kairos configuration (config-driven scoring).
 *
 * This file is intentionally explicit and human-tunable:
 * - Add/adjust modules, phase mappings, and signal weights here.
 * - `scripts/generate-status.ts` and `scripts/linear-sync.ts` consume this.
 *
 * HARD RULES:
 * - Do not hardcode phase counts. Phases are discovered from scripts/seed-phases.ts.
 * - Keep scoring deterministic: do not include timestamps or randomized weights.
 */

export type KairosStatus = 'Done' | 'In Progress' | 'Planned';

export type SignalType =
  | 'file_exists'
  | 'glob_exists'
  | 'api_route_exists'
  | 'action_exists'
  | 'firestore_rules_match'
  | 'firestore_index_match'
  | 'test_exists'
  | 'import_used';

export type Signal = {
  id: string;
  description: string;
  type: SignalType;
  /**
   * Weight in the 0..1 range. Module/phase score is weighted sum / total weight.
   */
  weight: number;
  /**
   * Evaluation parameters. Exact schema depends on SignalType.
   */
  params:
    | { path: string } // file_exists
    | { glob: string } // glob_exists/test_exists/api_route_exists
    | { exportName: string; file: string } // action_exists
    | { collection: string } // firestore_rules_match
    | { collectionGroup: string; fields: Array<{ fieldPath: string; order?: 'ASCENDING' | 'DESCENDING' }> } // firestore_index_match
    | { module: string; path: string }; // import_used
};

export type ModuleDef = {
  id: string;
  name: string;
  description: string;
  area: 'frontend' | 'backend' | 'infra' | 'docs';
  /**
   * Used by Linear labels: module:<label>
   */
  label: string;
  /**
   * Optional mapping to phase IDs (discovered) for Linear grouping.
   * This is Kairos configuration (not a repo fact); tune as needed.
   */
  phaseIds?: number[];
  signals: Signal[];
};

/**
 * NOTE: Phase definitions (titles/status) are discovered from scripts/seed-phases.ts.
 * Here we only map phase IDs to additional required signals for scoring.
 */
export type PhaseSignalMapping = {
  phaseId: number;
  signals: Signal[];
};

export const KAIROS_PROJECT_NAME = "Kairos — Pandora’s Box Control Tower";
export const KAIROS_MARKER_PREFIX = 'PB-KAIROS:';

export const DEFAULT_SCORING_WEIGHTS = {
  // Weight of overall completion across modules (phases are reported separately)
  modulesOverall: 1.0,
};

export const MODULES: ModuleDef[] = [
  {
    id: 'core-chat-threads',
    name: 'Core Chat + Threads',
    description: 'Message submission, thread lifecycle, realtime chat history.',
    area: 'backend',
    label: 'core_chat_threads',
    phaseIds: [1, 10],
    signals: [
      { id: 'actions.chat', description: 'Server actions: chat', type: 'file_exists', weight: 0.2, params: { path: 'src/app/actions/chat.ts' } },
      { id: 'flow.chatLane', description: 'Chat lane flow exists', type: 'file_exists', weight: 0.2, params: { path: 'src/ai/flows/run-chat-lane.ts' } },
      { id: 'ui.chatHistoryHook', description: 'Realtime chat history hook exists', type: 'file_exists', weight: 0.1, params: { path: 'src/hooks/use-chat-history.ts' } },
      { id: 'rules.history', description: 'Firestore rules cover history', type: 'firestore_rules_match', weight: 0.1, params: { collection: 'history' } },
      { id: 'rules.threads', description: 'Firestore rules cover threads', type: 'firestore_rules_match', weight: 0.1, params: { collection: 'threads' } },
      { id: 'indexes.history_thread_user_createdAt', description: 'Composite index for history thread/user/createdAt', type: 'firestore_index_match', weight: 0.1, params: { collectionGroup: 'history', fields: [{ fieldPath: 'threadId', order: 'ASCENDING' }, { fieldPath: 'userId', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'ASCENDING' }] } },
      { id: 'frontend.pandoraUiChat', description: 'Pandora UI chat route exists', type: 'glob_exists', weight: 0.1, params: { glob: 'src/app/(pandora-ui)/page.tsx' } },
      { id: 'tests.graphView', description: 'At least one component test exists', type: 'test_exists', weight: 0.1, params: { glob: 'src/**/__tests__/**/*.test.*' } },
    ],
  },
  {
    id: 'memory-embeddings',
    name: 'Memory + Embeddings',
    description: 'Embeddings generation, vector search, memory persistence utilities.',
    area: 'backend',
    label: 'memory_embeddings',
    phaseIds: [1, 10],
    signals: [
      { id: 'lib.vector', description: 'Vector utilities exist', type: 'file_exists', weight: 0.25, params: { path: 'src/lib/vector.ts' } },
      { id: 'lib.memoryUtils', description: 'Centralized memory utils exist', type: 'file_exists', weight: 0.25, params: { path: 'src/lib/memory-utils.ts' } },
      { id: 'rules.memories', description: 'Firestore rules cover memories', type: 'firestore_rules_match', weight: 0.1, params: { collection: 'memories' } },
      { id: 'indexes.memories_vector', description: 'Memories vector index exists', type: 'firestore_index_match', weight: 0.1, params: { collectionGroup: 'memories', fields: [{ fieldPath: '__name__', order: 'ASCENDING' }, { fieldPath: 'embedding' }] } as any },
      { id: 'findNearest.used', description: 'Firestore vector search is used', type: 'import_used', weight: 0.15, params: { module: 'findNearest', path: 'src/lib/vector.ts' } },
      { id: 'actions.knowledge', description: 'Knowledge actions exist', type: 'file_exists', weight: 0.15, params: { path: 'src/app/actions/knowledge.ts' } },
    ],
  },
  {
    id: 'knowledge-upload',
    name: 'Knowledge Upload',
    description: 'File upload, chunking, embeddings batch generation, persistence.',
    area: 'backend',
    label: 'knowledge_upload',
    phaseIds: [1, 10],
    signals: [
      { id: 'actions.knowledge', description: 'Knowledge actions exist', type: 'file_exists', weight: 0.25, params: { path: 'src/app/actions/knowledge.ts' } },
      { id: 'lib.chunking', description: 'Chunking utility exists', type: 'file_exists', weight: 0.25, params: { path: 'src/lib/chunking.ts' } },
      { id: 'ui.knowledgeUploadComponent', description: 'Knowledge upload UI component exists', type: 'file_exists', weight: 0.2, params: { path: 'src/components/settings/knowledge-upload.tsx' } },
      { id: 'rules.storage', description: 'Storage rules file exists', type: 'file_exists', weight: 0.1, params: { path: 'storage.rules' } },
      { id: 'rateLimit.uploads', description: 'Rate limiting includes uploads', type: 'file_exists', weight: 0.2, params: { path: 'src/lib/rate-limit.ts' } },
    ],
  },
  {
    id: 'artifacts',
    name: 'Artifacts',
    description: 'Artifact extraction/persistence and UI viewers.',
    area: 'backend',
    label: 'artifacts',
    phaseIds: [10],
    signals: [
      { id: 'flow.answerLane', description: 'Answer lane flow exists', type: 'file_exists', weight: 0.25, params: { path: 'src/ai/flows/run-answer-lane.ts' } },
      { id: 'mcp.generateArtifact', description: 'MCP tool generate_artifact exists', type: 'file_exists', weight: 0.15, params: { path: 'src/mcp/tools/generate-artifact.ts' } },
      { id: 'ui.artifactViewer', description: 'Artifact viewer UI exists', type: 'file_exists', weight: 0.2, params: { path: 'src/components/artifacts/artifact-viewer.tsx' } },
      { id: 'rules.artifacts', description: 'Firestore rules cover artifacts', type: 'firestore_rules_match', weight: 0.1, params: { collection: 'artifacts' } },
      { id: 'indexes.artifacts_user_createdAt', description: 'Artifacts index exists', type: 'firestore_index_match', weight: 0.1, params: { collectionGroup: 'artifacts', fields: [{ fieldPath: 'userId', order: 'ASCENDING' }, { fieldPath: 'createdAt', order: 'DESCENDING' }] } },
      { id: 'tests.artifactComponents', description: 'At least one artifact component exists', type: 'glob_exists', weight: 0.2, params: { glob: 'src/components/artifacts/*.tsx' } },
    ],
  },
  {
    id: 'knowledge-graph',
    name: 'Knowledge Graph + Analytics',
    description: 'Knowledge graph extraction, storage, graph analytics, and UI graph view.',
    area: 'backend',
    label: 'knowledge_graph',
    phaseIds: [2, 4],
    signals: [
      { id: 'lib.knowledgeGraph', description: 'Knowledge graph lib exists', type: 'file_exists', weight: 0.2, params: { path: 'src/lib/knowledge-graph.ts' } },
      { id: 'lib.graphAnalytics', description: 'Graph analytics lib exists', type: 'file_exists', weight: 0.2, params: { path: 'src/lib/graph-analytics.ts' } },
      { id: 'api.system.knowledge', description: 'System knowledge API exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/system/knowledge/route.ts' } },
      { id: 'api.system.graphAnalytics', description: 'System graph analytics API exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/system/graph-analytics/route.ts' } },
      { id: 'rules.graphNodes', description: 'Rules cover system_knowledge_graph', type: 'firestore_rules_match', weight: 0.1, params: { collection: 'system_knowledge_graph' } },
      { id: 'rules.graphEdges', description: 'Rules cover knowledge_edges', type: 'firestore_rules_match', weight: 0.1, params: { collection: 'knowledge_edges' } },
      { id: 'ui.graphPage', description: 'Graph page exists', type: 'glob_exists', weight: 0.2, params: { glob: 'src/app/(pandora-ui)/graph/page.tsx' } },
    ],
  },
  {
    id: 'context-layer',
    name: 'Context Layer (Phase 3)',
    description: 'Weighted contextual recall, context store, and decay cron.',
    area: 'backend',
    label: 'context_layer',
    phaseIds: [3],
    signals: [
      { id: 'lib.contextManager', description: 'Context manager exists', type: 'file_exists', weight: 0.25, params: { path: 'src/lib/context-manager.ts' } },
      { id: 'lib.contextStore', description: 'Context store exists', type: 'file_exists', weight: 0.25, params: { path: 'src/lib/context-store.ts' } },
      { id: 'api.cron.contextDecay', description: 'Context decay cron exists', type: 'file_exists', weight: 0.2, params: { path: 'src/app/api/cron/context-decay/route.ts' } },
      { id: 'rules.contextStore', description: 'Rules cover context_store', type: 'firestore_rules_match', weight: 0.15, params: { collection: 'context_store' } },
      { id: 'tests.phase3', description: 'Phase 3 validation script exists', type: 'file_exists', weight: 0.15, params: { path: 'scripts/validate-phase3-context.ts' } },
    ],
  },
  {
    id: 'hybrid-search',
    name: 'Hybrid Search (Phase 5)',
    description: 'Hybrid internal+external search with caching and scoring.',
    area: 'backend',
    label: 'hybrid_search',
    phaseIds: [5],
    signals: [
      { id: 'lib.hybridSearch', description: 'Hybrid search exists', type: 'file_exists', weight: 0.25, params: { path: 'src/lib/hybrid-search.ts' } },
      { id: 'lib.externalCache', description: 'External cache exists', type: 'file_exists', weight: 0.15, params: { path: 'src/lib/external-cache.ts' } },
      { id: 'lib.tavily', description: 'Tavily integration exists', type: 'file_exists', weight: 0.15, params: { path: 'src/lib/tavily.ts' } },
      { id: 'api.chatgpt.hybridRetrieve', description: 'ChatGPT hybrid retrieve endpoint exists', type: 'file_exists', weight: 0.15, params: { path: 'src/app/api/chatgpt/hybrid-retrieve/route.ts' } },
      { id: 'tests.hybrid', description: 'Hybrid search tests exist', type: 'test_exists', weight: 0.15, params: { glob: 'tests/lib/hybrid-search.test.ts' } },
      { id: 'rules.externalKnowledge', description: 'Rules cover external_knowledge', type: 'firestore_rules_match', weight: 0.15, params: { collection: 'external_knowledge' } },
    ],
  },
  {
    id: 'meta-learning-feedback',
    name: 'Meta-learning + Feedback (Phase 6)',
    description: 'Feedback capture and adaptive weights/meta-learning loops.',
    area: 'backend',
    label: 'meta_learning',
    phaseIds: [6, 8],
    signals: [
      { id: 'lib.metaLearning', description: 'Meta-learning module exists', type: 'file_exists', weight: 0.2, params: { path: 'src/lib/meta-learning.ts' } },
      { id: 'lib.adaptiveWeights', description: 'Adaptive weights exists', type: 'file_exists', weight: 0.15, params: { path: 'src/lib/adaptive-weights.ts' } },
      { id: 'lib.feedbackManager', description: 'Feedback manager exists', type: 'file_exists', weight: 0.15, params: { path: 'src/lib/feedback-manager.ts' } },
      { id: 'api.feedback', description: 'Feedback API exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/feedback/route.ts' } },
      { id: 'api.cron.metaLearning', description: 'Meta-learning cron exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/cron/meta-learning/route.ts' } },
      { id: 'rules.metaLearningState', description: 'Rules cover meta_learning_state', type: 'firestore_rules_match', weight: 0.15, params: { collection: 'meta_learning_state' } },
      { id: 'rules.performanceMetrics', description: 'Rules cover performance_metrics', type: 'firestore_rules_match', weight: 0.15, params: { collection: 'performance_metrics' } },
    ],
  },
  {
    id: 'agents-cron',
    name: 'Agents + Cron',
    description: 'Nightly reflection, deep research, daily briefing, cleanup, and cron routes.',
    area: 'backend',
    label: 'agents_cron',
    phaseIds: [12],
    signals: [
      { id: 'agent.nightlyReflection', description: 'Nightly reflection agent exists', type: 'file_exists', weight: 0.2, params: { path: 'src/ai/agents/nightly-reflection.ts' } },
      { id: 'agent.deepResearch', description: 'Deep research agent exists', type: 'file_exists', weight: 0.2, params: { path: 'src/ai/agents/deep-research.ts' } },
      { id: 'cron.nightlyReflection', description: 'Nightly reflection cron route exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/cron/nightly-reflection/route.ts' } },
      { id: 'cron.deepResearch', description: 'Deep research cron route exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/cron/deep-research/route.ts' } },
      { id: 'cron.dailyBriefing', description: 'Daily briefing cron route exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/cron/daily-briefing/route.ts' } },
      { id: 'cron.cleanup', description: 'Cleanup cron route exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/cron/cleanup/route.ts' } },
      { id: 'cron.reindexMemories', description: 'Reindex memories cron route exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/cron/reindex-memories/route.ts' } },
      { id: 'cron.contextDecay', description: 'Context decay cron route exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/cron/context-decay/route.ts' } },
      { id: 'cron.metaLearning', description: 'Meta-learning cron route exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/cron/meta-learning/route.ts' } },
    ],
  },
  {
    id: 'mcp-integrations',
    name: 'MCP + Integrations',
    description: 'MCP server, HTTP bridge, ChatGPT Actions endpoints, and OpenAPI schemas.',
    area: 'backend',
    label: 'mcp_integrations',
    phaseIds: [15],
    signals: [
      { id: 'mcp.server', description: 'MCP server entry exists', type: 'file_exists', weight: 0.2, params: { path: 'src/mcp/index.ts' } },
      { id: 'api.mcp.bridge', description: 'MCP HTTP bridge exists', type: 'file_exists', weight: 0.15, params: { path: 'src/app/api/mcp/[...tool]/route.ts' } },
      { id: 'api.mcp.openapi', description: 'MCP OpenAPI route exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/mcp/openapi/route.ts' } },
      { id: 'api.mcp.runFlow', description: 'MCP runFlow route exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/mcp/runFlow/route.ts' } },
      { id: 'api.chatgpt.store', description: 'ChatGPT store-memory exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/chatgpt/store-memory/route.ts' } },
      { id: 'api.chatgpt.retrieve', description: 'ChatGPT retrieve-memories exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/api/chatgpt/retrieve-memories/route.ts' } },
      { id: 'openapi.mcp', description: 'MCP OpenAPI schema exists', type: 'glob_exists', weight: 0.15, params: { glob: 'public/openapi-mcp.yaml' } },
    ],
  },
  {
    id: 'frontend-system',
    name: 'Frontend System',
    description: 'Pandora UI routes/components and legacy UI surfaces.',
    area: 'frontend',
    label: 'frontend_system',
    phaseIds: [1, 10, 15],
    signals: [
      { id: 'ui.pandoraUILayout', description: 'Pandora UI layout exists', type: 'file_exists', weight: 0.2, params: { path: 'src/app/(pandora-ui)/layout.tsx' } },
      { id: 'ui.settingsPage', description: 'Settings page exists', type: 'file_exists', weight: 0.2, params: { path: 'src/app/(pandora-ui)/settings/page.tsx' } },
      { id: 'ui.graphPage', description: 'Graph page exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/(pandora-ui)/graph/page.tsx' } },
      { id: 'ui.legacyPandorasBox', description: 'Legacy PandorasBox component exists', type: 'file_exists', weight: 0.15, params: { path: 'src/components/pandoras-box.tsx' } },
      { id: 'ui.authGuard', description: 'Auth guard exists', type: 'file_exists', weight: 0.15, params: { path: 'src/components/auth/auth-guard.tsx' } },
      { id: 'ui.commandMenu', description: 'Command menu exists', type: 'file_exists', weight: 0.1, params: { path: 'src/components/command-menu.tsx' } },
      { id: 'ui.themeHook', description: 'Theme hook exists', type: 'file_exists', weight: 0.1, params: { path: 'src/hooks/use-theme.tsx' } },
    ],
  },
  {
    id: 'ui-ux',
    name: 'UI/UX — Digital Void Shell + Pages',
    description: 'Digital Void design system, app shell, and all user-facing pages (Chat, Knowledge, Memories, Artifacts, Graph, PandoraUI Dashboard, Settings).',
    area: 'frontend',
    label: 'ui_ux',
    phaseIds: [1, 10],
    signals: [
      { id: 'ui.appShellLayout', description: 'App shell layout exists', type: 'file_exists', weight: 0.15, params: { path: 'src/app/(pandora-ui)/layout.tsx' } },
      { id: 'ui.threadSidebar', description: 'Thread sidebar component exists', type: 'glob_exists', weight: 0.1, params: { glob: 'src/app/(pandora-ui)/components/ThreadSidebar.tsx' } },
      { id: 'ui.topbar', description: 'Topbar component exists', type: 'glob_exists', weight: 0.1, params: { glob: 'src/app/(pandora-ui)/components/Topbar.tsx' } },
      { id: 'ui.inspectorDrawer', description: 'Inspector drawer component exists', type: 'glob_exists', weight: 0.1, params: { glob: 'src/app/(pandora-ui)/components/InspectorDrawer.tsx' } },
      { id: 'ui.chatPage', description: 'Chat page exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/(pandora-ui)/page.tsx' } },
      { id: 'ui.knowledgePage', description: 'Knowledge page exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/(pandora-ui)/knowledge/page.tsx' } },
      { id: 'ui.memoriesPage', description: 'Memories page exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/(pandora-ui)/memories/page.tsx' } },
      { id: 'ui.artifactsPage', description: 'Artifacts page exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/(pandora-ui)/artifacts/page.tsx' } },
      { id: 'ui.graphPage', description: 'Graph page exists', type: 'file_exists', weight: 0.05, params: { path: 'src/app/(pandora-ui)/graph/page.tsx' } },
      { id: 'ui.pandoraDashboardPage', description: 'PandoraUI Dashboard page exists', type: 'file_exists', weight: 0.1, params: { path: 'src/app/(pandora-ui)/pandora-ui/page.tsx' } },
      { id: 'ui.themeTokens', description: 'Theme tokens file exists', type: 'file_exists', weight: 0.1, params: { path: 'src/styles/digital-void.css' } },
      { id: 'ui.themeHook', description: 'Theme hook exists', type: 'file_exists', weight: 0.05, params: { path: 'src/hooks/use-theme.tsx' } },
      { id: 'ui.sharedComponents', description: 'Shared UI components exist', type: 'glob_exists', weight: 0.05, params: { glob: 'src/components/ui/*.tsx' } },
    ],
  },
  {
    id: 'security-ops',
    name: 'Security + Ops',
    description: 'Rules, hosting config, deployment docs, monitoring hooks.',
    area: 'infra',
    label: 'security_ops',
    phaseIds: [1],
    signals: [
      { id: 'rules.firestore', description: 'Firestore rules exist', type: 'file_exists', weight: 0.2, params: { path: 'firestore.rules' } },
      { id: 'indexes.firestore', description: 'Firestore indexes exist', type: 'file_exists', weight: 0.15, params: { path: 'firestore.indexes.json' } },
      { id: 'rules.storage', description: 'Storage rules exist', type: 'file_exists', weight: 0.1, params: { path: 'storage.rules' } },
      { id: 'apphosting', description: 'App Hosting config exists', type: 'file_exists', weight: 0.15, params: { path: 'apphosting.yaml' } },
      { id: 'deploy.runbook', description: 'Deployment runbook exists', type: 'glob_exists', weight: 0.2, params: { glob: 'DEPLOYMENT_RUNBOOK*.md' } },
      { id: 'sentry', description: 'Sentry config exists', type: 'glob_exists', weight: 0.2, params: { glob: 'sentry.*.config.ts' } },
    ],
  },
  {
    id: 'tests',
    name: 'Tests',
    description: 'Unit/integration tests and test harness configuration.',
    area: 'docs',
    label: 'tests',
    phaseIds: [1],
    signals: [
      { id: 'jest.config', description: 'Jest config exists', type: 'file_exists', weight: 0.4, params: { path: 'jest.config.js' } },
      { id: 'tests.repo', description: 'At least one test file exists', type: 'test_exists', weight: 0.3, params: { glob: 'tests/**/*.test.*' } },
      { id: 'tests.src', description: 'At least one src __tests__ file exists', type: 'test_exists', weight: 0.3, params: { glob: 'src/**/__tests__/**/*.test.*' } },
    ],
  },
];

export const PHASE_SIGNAL_MAPPINGS: PhaseSignalMapping[] = [
  {
    phaseId: 3,
    signals: [
      { id: 'phase3.contextDecayCron', description: 'Phase 3 context decay cron present', type: 'file_exists', weight: 0.4, params: { path: 'src/app/api/cron/context-decay/route.ts' } },
      { id: 'phase3.contextManager', description: 'Phase 3 context manager present', type: 'file_exists', weight: 0.3, params: { path: 'src/lib/context-manager.ts' } },
      { id: 'phase3.contextStore', description: 'Phase 3 context store present', type: 'file_exists', weight: 0.3, params: { path: 'src/lib/context-store.ts' } },
    ],
  },
  {
    phaseId: 5,
    signals: [
      { id: 'phase5.hybrid', description: 'Hybrid search present', type: 'file_exists', weight: 0.5, params: { path: 'src/lib/hybrid-search.ts' } },
      { id: 'phase5.tavily', description: 'Tavily integration present', type: 'file_exists', weight: 0.2, params: { path: 'src/lib/tavily.ts' } },
      { id: 'phase5.hybridLane', description: 'Hybrid lane flow present', type: 'file_exists', weight: 0.3, params: { path: 'src/ai/flows/run-hybrid-lane.ts' } },
    ],
  },
  {
    phaseId: 6,
    signals: [
      { id: 'phase6.metaLearning', description: 'Meta-learning present', type: 'file_exists', weight: 0.4, params: { path: 'src/lib/meta-learning.ts' } },
      { id: 'phase6.feedback', description: 'Feedback manager present', type: 'file_exists', weight: 0.3, params: { path: 'src/lib/feedback-manager.ts' } },
      { id: 'phase6.metaCron', description: 'Meta-learning cron present', type: 'file_exists', weight: 0.3, params: { path: 'src/app/api/cron/meta-learning/route.ts' } },
    ],
  },
  {
    phaseId: 12,
    signals: [
      { id: 'phase12.reflectionAgent', description: 'Nightly reflection agent present', type: 'file_exists', weight: 0.6, params: { path: 'src/ai/agents/nightly-reflection.ts' } },
      { id: 'phase12.reflectionCron', description: 'Nightly reflection cron present', type: 'file_exists', weight: 0.4, params: { path: 'src/app/api/cron/nightly-reflection/route.ts' } },
    ],
  },
  {
    phaseId: 15,
    signals: [
      { id: 'phase15.mcp', description: 'MCP server present', type: 'file_exists', weight: 0.5, params: { path: 'src/mcp/index.ts' } },
      { id: 'phase15.mcpBridge', description: 'MCP HTTP bridge present', type: 'file_exists', weight: 0.5, params: { path: 'src/app/api/mcp/[...tool]/route.ts' } },
    ],
  },
];


