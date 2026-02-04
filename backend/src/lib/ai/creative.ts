import { completeInference, ChatMessage } from '@/lib/sovereign/inference';

export interface StoryOutline {
    title: string;
    premise: string;
    beats: string[];
    tone: string;
}

export interface CharacterProfile {
    name: string;
    archetype: string;
    backstory: string;
    motivation: string;
    personality: string[];
}

/**
 * Creative Engine: Specialized logic for narrative coherence and long-form generation.
 */

export async function generateStoryOutline(premise: string): Promise<StoryOutline> {
    const prompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are a Master Storyteller. Create a detailed story outline based on the premise.
FORMAT JSON:
{
  "title": "Title",
  "premise": "Refined premise",
  "beats": ["Beat 1", "Beat 2", ...],
  "tone": "Tone description"
}`
        },
        { role: 'user', content: `Premise: ${premise}` }
    ];

    try {
        const response = await completeInference(prompt, 0.8);
        // Attempt to parse JSON, flexible fallback
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        return { title: 'Untitled', premise, beats: [response], tone: 'Unknown' };
    } catch (e) {
        console.error('Story Generation Error:', e);
        throw new Error('Failed to generate story outline');
    }
}

export async function developCharacter(archetype: string): Promise<CharacterProfile> {
    const prompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are an Expert Character Designer. Create a deep, psychological profile for a character archetype.
FORMAT JSON:
{
  "name": "Name",
  "archetype": "Archetype",
  "backstory": "Detailed backstory...",
  "motivation": "Core drive...",
  "personality": ["Trait 1", "Trait 2"]
}`
        },
        { role: 'user', content: `Archetype: ${archetype}` }
    ];

    try {
        const response = await completeInference(prompt, 0.85);
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Invalid JSON response');
    } catch (e) {
        return { name: 'Unknown', archetype, backstory: 'Generation failed', motivation: '', personality: [] };
    }
}

export async function writeChapter(outline: string, characters: CharacterProfile[], context: string = ''): Promise<string> {
    const charContext = characters.map(c => `${c.name} (${c.archetype}): ${c.motivation}`).join('\n');

    const prompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are a Best-Selling Novelist. Write a compelling chapter based on the outline.
Focus on: Show, Don't Tell, Sensory Details, and Deep POV.
Characters:
${charContext}

Previous Context:
${context}`
        },
        { role: 'user', content: `Write Chapter Outline: ${outline}` }
    ];

    return await completeInference(prompt, 0.9);
}

// Legacy / Artifact Support
export interface ArtifactDefinition {
    title: string;
    type: 'code' | 'markdown' | 'html' | 'svg' | 'react';
    content: string;
    explanation: string;
}

export async function generateCreativeArtifact(prompt: string, type: ArtifactDefinition['type']): Promise<ArtifactDefinition> {
    const creativePrompt: ChatMessage[] = [
        {
            role: 'system',
            content: `You are the Master Architect. Generate a high-fidelity ${type} artifact.
FORMAT:
<title>Title</title>
<explanation>Context</explanation>
<content>
[Code/Content]
</content>`
        },
        { role: 'user', content: prompt }
    ];

    const rawResponse = await completeInference(creativePrompt, 0.7);
    const title = rawResponse.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.trim() || "Untitled";
    const explanation = rawResponse.match(/<explanation>([\s\S]*?)<\/explanation>/)?.[1]?.trim() || "";
    const content = rawResponse.match(/<content>([\s\S]*?)<\/content>/)?.[1]?.trim() || rawResponse;

    return { title, type, content, explanation };
}
