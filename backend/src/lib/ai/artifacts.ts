import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface ArtifactContext {
    userAgent: string;
    platform: 'mobile' | 'desktop';
}

/**
 * Artifact Manager: Handles specialized format generation (SVG, Mermaid, React).
 */

export async function generateDiagram(description: string, type: 'mermaid' | 'svg'): Promise<string> {
    const prompt: ChatMessage[] = [
        {
            role: 'system',
            content: type === 'mermaid'
                ? `Generate a valid Mermaid.js chart. Return ONLY the code inside \`\`\`mermaid blocks.`
                : `Generate a clean, minimal SVG string. Return ONLY the <svg> tag.`
        },
        { role: 'user', content: description }
    ];

    const response = await completeInference(prompt, 0.4);

    if (type === 'mermaid') {
        return response.match(/```mermaid([\s\S]*?)```/)?.[1]?.trim() || response;
    }
    return response.match(/<svg[\s\S]*<\/svg>/)?.[0] || response;
}

export async function refineArtifact(content: string, feedback: string): Promise<string> {
    const prompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are an Editor. Improve the artifact based on feedback. Maintain format.`
        },
        { role: 'user', content: `Original:\n${content}\n\nFeedback: ${feedback}` }
    ];
    return await completeInference(prompt, 0.5);
}
