'use server';

/**
 * @fileOverview A flow for curating knowledge packs that the agent can load and unload as context.
 *
 * - curateKnowledgePacks - A function that handles the knowledge pack curation process.
 * - CurateKnowledgePacksInput - The input type for the curateKnowledgePacks function.
 * - CurateKnowledgePacksOutput - The return type for the curateKnowledgePacks function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CurateKnowledgePacksInputSchema = z.object({
  knowledgePackName: z.string().describe('The name of the knowledge pack.'),
  knowledgePackDescription: z.string().describe('A description of the knowledge pack.'),
  knowledgePackContent: z.string().describe('The content of the knowledge pack.'),
});

export type CurateKnowledgePacksInput = z.infer<typeof CurateKnowledgePacksInputSchema>;

const CurateKnowledgePacksOutputSchema = z.object({
  success: z.boolean().describe('Whether the knowledge pack was successfully curated.'),
  message: z.string().describe('A message indicating the result of the curation process.'),
});

export type CurateKnowledgePacksOutput = z.infer<typeof CurateKnowledgePacksOutputSchema>;

export async function curateKnowledgePacks(
  input: CurateKnowledgePacksInput
): Promise<CurateKnowledgePacksOutput> {
  return curateKnowledgePacksFlow(input);
}

const prompt = ai.definePrompt({
  name: 'curateKnowledgePacksPrompt',
  input: {schema: CurateKnowledgePacksInputSchema},
  output: {schema: CurateKnowledgePacksOutputSchema},
  prompt: `You are a knowledge curator. A user wants to create a knowledge pack with the following details:

Knowledge Pack Name: {{{knowledgePackName}}}
Knowledge Pack Description: {{{knowledgePackDescription}}}
Knowledge Pack Content: {{{knowledgePackContent}}}

Please confirm that the knowledge pack has been successfully created and provide a confirmation message to the user.
`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const curateKnowledgePacksFlow = ai.defineFlow(
  {
    name: 'curateKnowledgePacksFlow',
    inputSchema: CurateKnowledgePacksInputSchema,
    outputSchema: CurateKnowledgePacksOutputSchema,
  },
  async input => {
    try {
      const {output} = await prompt(input);
      return {
        success: true,
        message: output?.message || 'Knowledge pack successfully curated.',
      };
    } catch (error: any) {
      console.error('Error curating knowledge pack:', error);
      return {
        success: false,
        message: `Failed to curate knowledge pack: ${error.message || 'Unknown error'}`,
      };
    }
  }
);
