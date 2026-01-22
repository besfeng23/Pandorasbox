'use server';

import { ai } from '@/ai/genkit';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { searchMemories, generateEmbedding } from '@/lib/vector';
import {
  AgentType,
  REASONING_AGENT_GRAPH,
  getNextAgent,
  getAgentByType,
  AgentContext,
  AgentHandoff,
} from '@/lib/agent-graph';
import {
  createAgentSession,
  updateAgentSession,
  recordAgentExecution,
  recordAgentHandoff,
} from '@/lib/agent-memory';
import { saveMemory } from '@/lib/memory-utils';
import { FieldValue } from 'firebase-admin/firestore';

const ReasoningLaneInputSchema = z.object({
  query: z.string(),
  userEmail: z.string().optional(),
  userId: z.string().optional(),
});

const ReasoningLaneOutputSchema = z.object({
  sessionId: z.string(),
  result: z.string(),
  reflection: z.string(),
  keyInsights: z.array(z.string()),
});

/**
 * Phase 4: Reasoning Lane with Multi-Agent System
 * 
 * Flow: MemoryAgent → PlannerAgent → ReasonerAgent → ReflectorAgent
 */
export async function runReasoningLane(
  input: z.infer<typeof ReasoningLaneInputSchema>
): Promise<z.infer<typeof ReasoningLaneOutputSchema>> {
  const reasoningFlow = ai.defineFlow(
    {
      name: 'runReasoningLaneFlow',
      inputSchema: ReasoningLaneInputSchema,
      outputSchema: ReasoningLaneOutputSchema,
    },
    async ({ query, userEmail, userId: providedUserId }) => {
      // Get or resolve userId
      let userId = providedUserId;
      if (!userId && userEmail) {
        const authAdmin = getAuthAdmin();
        try {
          const user = await authAdmin.getUserByEmail(userEmail);
          userId = user.uid;
        } catch (error: any) {
          if (error.code === 'auth/user-not-found') {
            throw new Error(`User with email ${userEmail} not found`);
          }
          throw error;
        }
      }

      if (!userId) {
        throw new Error('Either userId or userEmail must be provided');
      }

      // Create agent session
      const session = await createAgentSession(userId, query);
      console.log(`[ReasoningLane] Created session ${session.sessionId}`);

      try {
        // Step 1: Memory Agent - Retrieve relevant memories
        console.log(`[ReasoningLane] MemoryAgent: Retrieving memories for "${query}"`);
        const memoryResults = await searchMemories(query, userId, 'universe', 10);
        const contextMemories = memoryResults.map(m => m.text).join('\n\n');
        const memoryIds = memoryResults.map(m => m.id);

        await recordAgentExecution(
          session.sessionId,
          AgentType.MEMORY,
          { memories: memoryResults, context: contextMemories }
        );
        console.log(`[ReasoningLane] MemoryAgent: Found ${memoryResults.length} relevant memories`);

        // Handoff: Memory → Planner
        const memoryToPlannerHandoff: AgentHandoff = {
          from: AgentType.MEMORY,
          to: AgentType.PLANNER,
          data: { goal: query, context: contextMemories },
          timestamp: new Date(),
        };
        await recordAgentHandoff(session.sessionId, memoryToPlannerHandoff);

        // Step 2: Planner Agent - Create execution plan
        console.log(`[ReasoningLane] PlannerAgent: Creating plan`);
        const plannerResult = await executePlannerAgent(query, contextMemories);
        await recordAgentExecution(
          session.sessionId,
          AgentType.PLANNER,
          plannerResult
        );
        console.log(`[ReasoningLane] PlannerAgent: Created plan with ${plannerResult.plan.length} steps`);

        // Handoff: Planner → Reasoner
        const plannerToReasonerHandoff: AgentHandoff = {
          from: AgentType.PLANNER,
          to: AgentType.REASONER,
          data: { goal: query, plan: plannerResult.plan, context: contextMemories },
          timestamp: new Date(),
        };
        await recordAgentHandoff(session.sessionId, plannerToReasonerHandoff);

        // Step 3: Reasoner Agent - Perform deep reasoning
        console.log(`[ReasoningLane] ReasonerAgent: Performing reasoning`);
        const reasonerResult = await executeReasonerAgent(
          query,
          plannerResult.plan,
          contextMemories,
          plannerResult.reasoning
        );
        await recordAgentExecution(
          session.sessionId,
          AgentType.REASONER,
          reasonerResult
        );
        console.log(`[ReasoningLane] ReasonerAgent: Reasoning complete, ${reasonerResult.insights.length} insights`);

        // Handoff: Reasoner → Reflector
        const reasonerToReflectorHandoff: AgentHandoff = {
          from: AgentType.REASONER,
          to: AgentType.REFLECTOR,
          data: {
            result: reasonerResult.result,
            reasoning: reasonerResult.reasoning,
            insights: reasonerResult.insights,
          },
          timestamp: new Date(),
        };
        await recordAgentHandoff(session.sessionId, reasonerToReflectorHandoff);

        // Step 4: Reflector Agent - Extract insights and save to memory
        console.log(`[ReasoningLane] ReflectorAgent: Reflecting on results`);
        const reflectorResult = await executeReflectorAgent(
          reasonerResult.result,
          reasonerResult.reasoning,
          reasonerResult.insights
        );
        await recordAgentExecution(
          session.sessionId,
          AgentType.REFLECTOR,
          reflectorResult
        );
        console.log(`[ReasoningLane] ReflectorAgent: Reflection complete, ${reflectorResult.keyInsights.length} key insights`);

        // Save insights to memory as high-importance entries
        for (const insight of reflectorResult.keyInsights) {
          await saveMemory({
            content: `⭐ INSIGHT: ${insight}`,
            userId,
            source: 'agent-reflection',
            type: 'insight',
            metadata: {
              importance: 0.8, // High importance for insights
            },
          });
        }

        // Update session with context memories and mark complete
        await updateAgentSession(session.sessionId, {
          contextMemories: memoryIds,
          status: 'complete',
        });

        return {
          sessionId: session.sessionId,
          result: reasonerResult.result,
          reflection: reflectorResult.reflection,
          keyInsights: reflectorResult.keyInsights,
        };
      } catch (error: any) {
        console.error(`[ReasoningLane] Error:`, error);
        await updateAgentSession(session.sessionId, {
          status: 'error',
        });
        throw error;
      }
    }
  );

  return reasoningFlow(input);
}

/**
 * Planner Agent: Creates execution plan
 */
async function executePlannerAgent(
  goal: string,
  context: string
): Promise<{ plan: string[]; reasoning: string }> {
  const response = await ai.generate({
    model: 'vertexai/gemini-1.5-pro',
    prompt: [
      {
        text: `You are a Planning Agent. Your job is to create a step-by-step execution plan to achieve a goal.

Given the goal and available context, create a clear, actionable plan.

Context:
${context}

Goal: ${goal}

Return a JSON object with:
- "plan": array of step strings
- "reasoning": brief explanation of the plan`,
      },
    ],
    config: { temperature: 0 },
    output: { format: 'json' }
  });

  const parsed = response.output as any;
  return {
    plan: parsed?.plan || [],
    reasoning: parsed?.reasoning || '',
  };
}

/**
 * Reasoner Agent: Performs deep reasoning
 */
async function executeReasonerAgent(
  goal: string,
  plan: string[],
  context: string,
  plannerReasoning: string
): Promise<{ result: string; reasoning: string; insights: string[] }> {
  const response = await ai.generate({
    model: 'vertexai/gemini-1.5-pro',
    prompt: [
      {
        text: `You are a Reasoning Agent. Perform deep analysis and reasoning to achieve the goal.

Context:
${context}

Planner's Reasoning:
${plannerReasoning}

Plan Steps:
${plan.map((s, i) => `${i + 1}. ${s}`).join('\n')}

Goal: ${goal}

Return a JSON object with:
- "result": the final reasoned answer/solution
- "reasoning": your detailed reasoning process
- "insights": array of key insights discovered`,
      },
    ],
    config: { temperature: 0 },
    output: { format: 'json' }
  });

  const parsed = response.output as any;
  return {
    result: parsed?.result || '',
    reasoning: parsed?.reasoning || '',
    insights: parsed?.insights || [],
  };
}

/**
 * Reflector Agent: Reflects on results and extracts insights
 */
async function executeReflectorAgent(
  result: string,
  reasoning: string,
  insights: string[]
): Promise<{ reflection: string; keyInsights: string[] }> {
  const response = await ai.generate({
    model: 'vertexai/gemini-1.5-pro',
    prompt: [
      {
        text: `You are a Reflection Agent. Reflect on the reasoning process and extract key learnings.

Result:
${result}

Reasoning Process:
${reasoning}

Insights:
${insights.join('\n')}

Return a JSON object with:
- "reflection": your reflection on the process and outcomes
- "keyInsights": array of the most important insights to remember`,
      },
    ],
    config: { temperature: 0 },
    output: { format: 'json' }
  });

  const parsed = response.output as any;
  return {
    reflection: parsed?.reflection || '',
    keyInsights: parsed?.keyInsights || [],
  };
}

