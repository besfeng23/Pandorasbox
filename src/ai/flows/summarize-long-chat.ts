'use server';

/**
 * @fileOverview Summarizes long chat histories to provide users with quick summaries.
 *
 * - summarizeLongChat - A function that summarizes a long chat history.
 * - SummarizeLongChatInput - The input type for the summarizeLongChat function.
 * - SummarizeLongChatOutput - The return type for the summarizeLongChat function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeLongChatInputSchema = z.object({
  chatHistory: z.string().describe('The complete chat history to summarize.'),
});
export type SummarizeLongChatInput = z.infer<typeof SummarizeLongChatInputSchema>;

const SummarizeLongChatOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the chat history.'),
});
export type SummarizeLongChatOutput = z.infer<typeof SummarizeLongChatOutputSchema>;

export async function summarizeLongChat(input: SummarizeLongChatInput): Promise<SummarizeLongChatOutput> {
  return summarizeLongChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeLongChatPrompt',
  input: {schema: SummarizeLongChatInputSchema},
  output: {schema: SummarizeLongChatOutputSchema},
  prompt: `You are an AI assistant designed to summarize long chat histories.

  Please provide a concise and informative summary of the following chat history:

  {{{chatHistory}}}

  Summary:`,
});

const summarizeLongChatFlow = ai.defineFlow(
  {
    name: 'summarizeLongChatFlow',
    inputSchema: SummarizeLongChatInputSchema,
    outputSchema: SummarizeLongChatOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
