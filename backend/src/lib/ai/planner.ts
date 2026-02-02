import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface PlanStep {
    id: string;
    description: string;
    agent: 'builder' | 'universe' | 'analyst';
    dependencies: string[];
}

export interface TaskPlan {
    steps: PlanStep[];
    goal: string;
}

/**
 * Decomposes a complex user request into a multi-step execution plan.
 * Identifies which sub-tasks require specialized agents.
 */
export async function generatePlan(query: string, context: string): Promise<TaskPlan> {
    const plannerPrompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are the Strategic Planner for Pandora's Box.
Break the user's request into a set of sequential steps.
Assign each step to a specialized agent:
- 'builder': Implementation, coding, file modification.
- 'universe': Broad research, context analysis, philosophical reasoning.
- 'analyst': Data processing, logic verification, metric analysis.

Respond with a JSON object:
{
  "goal": "Brief summary of the objective",
  "steps": [
    { "id": "step_1", "description": "...", "agent": "builder", "dependencies": [] }
  ]
}`
        },
        {
            role: 'user',
            content: `QUERY: "${query}"\nCONTEXT: "${context.substring(0, 500)}..."`
        }
    ];

    try {
        const rawPlan = await completeInference(plannerPrompt, 0.2);
        const cleanedJson = rawPlan.match(/\{[\s\S]*\}/)?.[0] || '{"steps": [], "goal": "Direct execution"}';
        const parsed = JSON.parse(cleanedJson);

        return {
            goal: parsed.goal || "Multi-step processing",
            steps: Array.isArray(parsed.steps) ? parsed.steps : []
        };

    } catch (error) {
        console.error('[Planner] Error:', error);
        return {
            goal: "Direct execution",
            steps: [{ id: 'core', description: 'Process the user message', agent: 'universe', dependencies: [] }]
        };
    }
}
