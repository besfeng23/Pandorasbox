import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface AgentTask {
    id: string;
    description: string;
    assignedTo: 'builder' | 'analyst' | 'universe' | 'critic';
    status: 'pending' | 'in_progress' | 'completed';
    result?: string;
}

export interface CollaborationResult {
    finalAnswer: string;
    agentContributions: { agent: string; contribution: string }[];
}

/**
 * Agent Collaboration Engine: Orchestrates multi-agent problem solving.
 */

export async function collaborativeSolve(problem: string): Promise<CollaborationResult> {
    // 1. Decomposition (Manager Agent)
    const decompositionPrompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are the Setup Manager. Break the problem into 2-3 distinct tasks for specialized agents.
Agents:
- Builder: Technical implementation, code.
- Analyst: Data analysis, logic checking.
- Universe: Creative synthesis, user empathy.
- Critic: Quality control.

FORMAT JSON:
[
  { "description": "Task 1", "assignedTo": "builder" },
  ...
]`
        },
        { role: 'user', content: `Problem: ${problem}` }
    ];

    let tasks: AgentTask[] = [];
    try {
        const rawPlan = await completeInference(decompositionPrompt, 0.4);
        const json = rawPlan.match(/\[[\s\S]*\]/)?.[0];
        if (json) {
            tasks = JSON.parse(json).map((t: any, i: number) => ({ ...t, id: `task-${i}`, status: 'pending' }));
        } else {
            tasks = [{ id: 'task-0', description: 'Solve the problem', assignedTo: 'universe', status: 'pending' }];
        }
    } catch (e) {
        tasks = [{ id: 'task-0', description: problem, assignedTo: 'universe', status: 'pending' }];
    }

    // 2. Parallel Execution
    const contributions: { agent: string; contribution: string }[] = [];

    await Promise.all(tasks.map(async (task) => {
        const agentPrompt: ChatMessage[] = [
            {
                role: 'system',
                content: `You are the ${task.assignedTo.toUpperCase()} Agent.
Task: ${task.description}
Context: Solving "${problem}"
Provide your specialized output.`
            },
            { role: 'user', content: "Execute task." }
        ];

        const result = await completeInference(agentPrompt, 0.7);
        contributions.push({ agent: task.assignedTo, contribution: result });
    }));

    // 3. Synthesis (Lead Agent)
    const synthesisPrompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are the Lead Integrator. Combine the agent outputs into a cohesive final answer.
Problem: ${problem}
Outputs:
${contributions.map(c => `[${c.agent}]: ${c.contribution}`).join('\n\n')}

Return the Final Answer.`
        },
        { role: 'user', content: "Synthesize." }
    ];

    const finalAnswer = await completeInference(synthesisPrompt, 0.5);

    return { finalAnswer, agentContributions: contributions };
}

export async function delegateTask(taskDescription: string): Promise<string> {
    const result = await collaborativeSolve(taskDescription);
    return result.finalAnswer;
}
