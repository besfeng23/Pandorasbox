/**
 * ═══════════════════════════════════════════════════════════════════════════
 * HYBRID AI MODULE - "Two-Brain System"
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Unified exports for the hybrid AI architecture:
 *   - Dispatcher: Routes queries to appropriate brain
 *   - Provider Factory: Manages Local and Cloud AI clients
 */

// Dispatcher Service
export {
  DispatcherService,
  getDispatcher,
  TargetAgent,
  IntentCategory,
  ClassificationSchema,
  type ClassificationResult,
  type DispatchResult
} from './dispatcher';

// AI Provider Factory
export {
  AIProviderFactory,
  getAIFactory,
  GroqModels,
  LocalModels,
  type ChatMessage,
  type CompletionOptions,
  type ProviderHealth
} from './provider-factory';

// Memory Janitor (re-export for convenience)
export { MemoryJanitor, getMemoryJanitor } from './memory-janitor';
