/**
 * Phase 4: Agentic Reasoning & Flow Orchestration
 * 
 * Agent Graph - Defines the multi-agent coordination structure
 * for reasoning and planning workflows.
 */

import { z } from 'zod';

/**
 * Agent types in the system
 */
export enum AgentType {
  MEMORY = 'memory',
  PLANNER = 'planner',
  REASONER = 'reasoner',
  REFLECTOR = 'reflector',
}

/**
 * Agent state during execution
 */
export type AgentState = 'idle' | 'active' | 'complete' | 'error';

/**
 * Agent definition
 */
export interface Agent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  outputSchema: z.ZodSchema;
}

/**
 * Agent execution context
 */
export interface AgentContext {
  userId: string;
  sessionId: string;
  goal: string;
  currentStep: number;
  totalSteps: number;
  agentResults: Map<string, unknown>;
  metadata: Record<string, unknown>;
}

/**
 * Agent handoff - defines how agents pass information
 */
export interface AgentHandoff {
  from: AgentType;
  to: AgentType;
  data: unknown;
  timestamp: Date;
}

/**
 * Agent graph structure - defines agent relationships
 */
export interface AgentGraph {
  nodes: Agent[];
  edges: Array<{
    from: AgentType;
    to: AgentType;
    condition?: (context: AgentContext) => boolean;
  }>;
}

/**
 * Standard agent graph for reasoning flow:
 * MemoryAgent → Planner → Reasoner → Reflector
 */
export const REASONING_AGENT_GRAPH: AgentGraph = {
  nodes: [
    {
      id: 'memory',
      type: AgentType.MEMORY,
      name: 'Memory Agent',
      description: 'Retrieves relevant memories and context',
      inputSchema: z.object({ query: z.string() }),
      outputSchema: z.object({ memories: z.array(z.any()), context: z.string() }),
    },
    {
      id: 'planner',
      type: AgentType.PLANNER,
      name: 'Planning Agent',
      description: 'Creates execution plan based on goal and context',
      inputSchema: z.object({ goal: z.string(), context: z.string() }),
      outputSchema: z.object({ plan: z.array(z.string()), reasoning: z.string() }),
    },
    {
      id: 'reasoner',
      type: AgentType.REASONER,
      name: 'Reasoning Agent',
      description: 'Performs deep reasoning and analysis',
      inputSchema: z.object({ goal: z.string(), plan: z.array(z.string()), context: z.string() }),
      outputSchema: z.object({ result: z.string(), reasoning: z.string(), insights: z.array(z.string()) }),
    },
    {
      id: 'reflector',
      type: AgentType.REFLECTOR,
      name: 'Reflection Agent',
      description: 'Reflects on the reasoning process and extracts insights',
      inputSchema: z.object({ result: z.string(), reasoning: z.string(), insights: z.array(z.string()) }),
      outputSchema: z.object({ reflection: z.string(), keyInsights: z.array(z.string()) }),
    },
  ],
  edges: [
    { from: AgentType.MEMORY, to: AgentType.PLANNER },
    { from: AgentType.PLANNER, to: AgentType.REASONER },
    { from: AgentType.REASONER, to: AgentType.REFLECTOR },
  ],
};

/**
 * Get next agent in the graph
 */
export function getNextAgent(
  currentAgent: AgentType,
  graph: AgentGraph
): AgentType | null {
  const edge = graph.edges.find(e => e.from === currentAgent);
  return edge?.to || null;
}

/**
 * Get agent definition by type
 */
export function getAgentByType(
  type: AgentType,
  graph: AgentGraph
): Agent | undefined {
  return graph.nodes.find(node => node.type === type);
}

/**
 * Validate agent handoff data
 */
export function validateHandoff(
  handoff: AgentHandoff,
  fromAgent: Agent,
  toAgent: Agent
): boolean {
  try {
    fromAgent.outputSchema.parse(handoff.data);
    toAgent.inputSchema.parse(handoff.data);
    return true;
  } catch {
    return false;
  }
}

