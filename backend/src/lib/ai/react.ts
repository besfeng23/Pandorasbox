import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface ToolDef {
    name: string;
    description: string;
    execute: (args: string) => Promise<string>;
}

export interface ReActResult {
    answer: string;
    steps: { thought: string; action: string; observation: string }[];
}

/**
 * Executes a Reason-Act-Observe loop (ReAct) to solve complex goals.
 * Limited to 5 steps to prevent infinite loops.
 */
export async function executeReAct(goal: string, tools: ToolDef[], maxSteps = 5): Promise<ReActResult> {
    let scratchpad = "";
    const steps: { thought: string; action: string; observation: string }[] = [];

    const systemPrompt = `You are a ReAct Agent. You solve tasks by iterating: Thought, Action, Observation.
Available Tools:
${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}

Format your response as:
Thought: [Reasoning]
Action: [ToolName] [Input] 
(Or "Action: Finish [Final Answer]" if done)

Goal: ${goal}`;

    for (let i = 0; i < maxSteps; i++) {
        const prompt: ChatMessage[] = [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Current History:\n${scratchpad}\n\nWhat is your next step?` }
        ];

        const response = await completeInference(prompt, 0.2); // Low temp for logic

        // Parse response
        const thought = response.match(/Thought: (.*)/)?.[1] || response;
        const actionLine = response.match(/Action: (.*)/)?.[1] || "";

        // Check for Finish
        if (actionLine.startsWith("Finish")) {
            const answer = actionLine.replace("Finish", "").trim();
            return { answer, steps };
        }

        // Parse Action
        const [toolName, ...args] = actionLine.split(' ');
        const toolInput = args.join(' ');
        const tool = tools.find(t => t.name === toolName);

        let observation = "Error: Tool not found.";
        if (tool) {
            try {
                observation = await tool.execute(toolInput);
            } catch (e: any) {
                observation = `Error: ${e.message}`;
            }
        } else if (!actionLine) {
            // If no action, assume thinking step only or implicit finish?
            // Let's force a break if the model is chatty
            if (response.length > 200) return { answer: response, steps };
        }

        const step = { thought, action: actionLine, observation };
        steps.push(step);
        scratchpad += `\nThought: ${thought}\nAction: ${actionLine}\nObservation: ${observation}`;
    }

    return { answer: "Max steps reached.", steps };
}
