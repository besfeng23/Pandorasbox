'use server';

import { ai } from '@/ai/genkit';
import { getFirestoreAdmin, getAuthAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import { searchMemories } from '@/lib/vector';
import {
  AgentType,
  AgentHandoff,
} from '@/lib/agent-graph';
import {
  createAgentSession,
  updateAgentSession,
  recordAgentExecution,
  recordAgentHandoff,
} from '@/lib/agent-memory';

const PlannerLaneInputSchema = z.object({
  goal: z.string(),
  userEmail: z.string().optional(),
  userId: z.string().optional(),
  context: z.string().optional(),
});

const PlannerLaneOutputSchema = z.object({
  sessionId: z.string(),
  plan: z.array(z.string()),
  reasoning: z.string(),
  estimatedSteps: z.number(),
});

/**
 * Phase 4: Planner Lane - Creates detailed execution plans
 * 
 * Flow: MemoryAgent → PlannerAgent
 */
export async function runPlannerLane(
  input: z.infer<typeof PlannerLaneInputSchema>
): Promise<z.infer<typeof PlannerLaneOutputSchema>> {
  const plannerFlow = ai.defineFlow(
    {
      name: 'runPlannerLaneFlow',
      inputSchema: PlannerLaneInputSchema,
      outputSchema: PlannerLaneOutputSchema,
    },
    async ({ goal, userEmail, userId: providedUserId, context: providedContext }) => {
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
      const session = await createAgentSession(userId, goal);
      console.log(`[PlannerLane] Created session ${session.sessionId}`);

      try {
        // Step 1: Memory Agent - Retrieve relevant memories
        console.log(`[PlannerLane] MemoryAgent: Retrieving memories for planning`);
         const memoryResults = await searchMemories(goal, userId, 'universe', 10);
        const contextMemories = memoryResults.map(m => m.text).join('\n\n');
        const memoryIds = memoryResults.map(m => m.id);

        // Combine provided context with retrieved memories
        const fullContext = providedContext
          ? `${providedContext}\n\n--- Relevant Memories ---\n${contextMemories}`
          : contextMemories;

        await recordAgentExecution(
          session.sessionId,
          AgentType.MEMORY,
          { memories: memoryResults, context: fullContext }
        );
        console.log(`[PlannerLane] MemoryAgent: Found ${memoryResults.length} relevant memories`);

        // Handoff: Memory → Planner
        const memoryToPlannerHandoff: AgentHandoff = {
          from: AgentType.MEMORY,
          to: AgentType.PLANNER,
          data: { goal, context: fullContext },
          timestamp: new Date(),
        };
        await recordAgentHandoff(session.sessionId, memoryToPlannerHandoff);

        // Step 2: Planner Agent - Create detailed execution plan
        console.log(`[PlannerLane] PlannerAgent: Creating detailed plan`);
        const plannerResult = await executeDetailedPlannerAgent(goal, fullContext);
        await recordAgentExecution(
          session.sessionId,
          AgentType.PLANNER,
          plannerResult
        );
        console.log(`[PlannerLane] PlannerAgent: Created plan with ${plannerResult.plan.length} steps`);

        // Update session and mark complete
        await updateAgentSession(session.sessionId, {
          contextMemories: memoryIds,
          status: 'complete',
        });

        return {
          sessionId: session.sessionId,
          plan: plannerResult.plan,
          reasoning: plannerResult.reasoning,
          estimatedSteps: plannerResult.plan.length,
        };
      } catch (error: any) {
        console.error(`[PlannerLane] Error:`, error);
        await updateAgentSession(session.sessionId, {
          status: 'error',
        });
        throw error;
      }
    }
  );

  return plannerFlow(input);
}

/**
 * Detailed Planner Agent: Creates comprehensive execution plan
 */
async function executeDetailedPlannerAgent(
  goal: string,
  context: string
): Promise<{ plan: string[]; reasoning: string }> {
  const response = await ai.generate({
    model: 'vertexai/gemini-1.5-pro',
    prompt: [
      {
        text: `You are an advanced Planning Agent. Create a detailed, step-by-step execution plan to achieve a goal.

Your plan should be:
- Actionable: Each step should be clear and executable
- Logical: Steps should follow a logical sequence
- Comprehensive: Cover all aspects needed to achieve the goal
- Adaptive: Consider the available context and constraints

Context:
${context}

Goal: ${goal}

Return a JSON object with:
- "plan": array of detailed step strings (each step should be specific and actionable)
- "reasoning": explanation of why this plan will achieve the goal`,
      },
    ],
    config: { temperature: 0.7 },
    output: { format: 'json' }
  });

  const parsed = response.output as any;
  return {
    plan: parsed?.plan || [],
    reasoning: parsed?.reasoning || '',
  };
}

