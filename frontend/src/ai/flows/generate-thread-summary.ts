'use server';

/**
 * @fileOverview This file defines a Genkit flow for generating summaries of chat threads.
 *
 * - generateThreadSummary - An async function that takes a thread of messages and returns a summary.
 * - GenerateThreadSummaryInput - The input type for the generateThreadSummary function.
 * - GenerateThreadSummaryOutput - The return type for the generateThreadSummary function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateThreadSummaryInputSchema = z.object({
  messages: z.array(z.string()).describe('A list of messages in the chat thread.'),
});

export type GenerateThreadSummaryInput = z.infer<typeof GenerateThreadSummaryInputSchema>;

const GenerateThreadSummaryOutputSchema = z.object({
  summary: z.string().describe('A summary of the chat thread.'),
});

export type GenerateThreadSummaryOutput = z.infer<typeof GenerateThreadSummaryOutputSchema>;

export async function generateThreadSummary(input: GenerateThreadSummaryInput): Promise<GenerateThreadSummaryOutput> {
  return generateThreadSummaryFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateThreadSummaryPrompt',
  input: {schema: GenerateThreadSummaryInputSchema},
  output: {schema: GenerateThreadSummaryOutputSchema},
  prompt: `You are an expert summarizer of chat threads. Please provide a concise summary of the following conversation:\n\n{% raw %}{{#each messages}}\n{{this}}\n{% endraw %}{{#endeach}}\n\nSummary: `,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const generateThreadSummaryFlow = ai.defineFlow(
  {
    name: 'generateThreadSummaryFlow',
    inputSchema: GenerateThreadSummaryInputSchema,
    outputSchema: GenerateThreadSummaryOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
