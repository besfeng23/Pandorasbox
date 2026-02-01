/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ARTIFACT GENERATION MCP TOOL
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Specifically targets the Groq provider to leverage its speed.
 */

import { z } from 'zod';
import { GroqProvider } from '@/modules/intelligence/llm-provider';

export const generateArtifactSchema = z.object({
    description: z.string().describe('Description of the component or code to generate'),
    language: z.enum(['typescript', 'javascript', 'tsx', 'markdown', 'css']).describe('Main language'),
    context: z.string().optional().describe('Additional context for generation')
});

/**
 * Generates an artifact using Groq for extreme speed.
 */
export async function generate_artifact(args: z.infer<typeof generateArtifactSchema>) {
    const { description, language, context } = args;

    const groqKey = process.env.GROQ_API_KEY;
    if (!groqKey) return { error: 'GROQ_API_KEY missing' };

    const provider = new GroqProvider(groqKey);

    const systemPrompt = `You are the BUILDER AGENT. 
Generate a high-quality ${language} artifact based on the description.
Optimized for React/Next.js flows.
Return ONLY the code within markdown fences.`;

    const userPrompt = `Description: ${description}\nContext: ${context || 'None'}`;

    try {
        const response = await provider.generateResponse([
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
        ], process.env.BUILDER_MODEL || 'llama-3.3-70b-versatile');

        return {
            artifact: response.content,
            language,
            status: 'success'
        };
    } catch (error: any) {
        return { error: error.message };
    }
}
