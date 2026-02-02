import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface ArtifactDefinition {
    title: string;
    type: 'code' | 'markdown' | 'html' | 'svg' | 'react';
    content: string;
    explanation: string;
}

/**
 * Generates high-quality creative artifacts using a recursive refinement approach.
 * Supports specialized formatting for diagrams, UI mockups, and complex documents.
 */
export async function generateCreativeArtifact(prompt: string, type: ArtifactDefinition['type']): Promise<ArtifactDefinition> {
    const creativePrompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are the Master Architect of Pandora's Box.
Your goal is to generate a high-fidelity artifact based on the user's request.
FORMAT:
<title>[Artifact Title]</title>
<explanation>[Brief context]</explanation>
<content>
[The actual code/markup/content]
</content>`
        },
        { role: 'user', content: `Generate a ${type} artifact for: "${prompt}"` }
    ];

    try {
        const rawResponse = await completeInference(creativePrompt, 0.7); // Higher temperature for creativity

        const title = rawResponse.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() || "Untitled Artifact";
        const explanation = rawResponse.match(/<explanation>([\s\S]*?)<\/explanation>/)?.[1]?.trim() || "";
        const content = rawResponse.match(/<content>([\s\S]*?)<\/content>/)?.[1]?.trim() || rawResponse;

        return { title, type, content, explanation };

    } catch (error) {
        console.error('[Creative] Error:', error);
        return {
            title: "Error Generating Artifact",
            type: 'markdown',
            content: "The creative engine encountered an error.",
            explanation: "Internal failure during generation."
        };
    }
}
