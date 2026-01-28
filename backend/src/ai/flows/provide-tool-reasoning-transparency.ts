'use server';
/**
 * @fileOverview A flow that provides tool reasoning transparency by showing the tools used,
 * inputs/outputs, and citations for tool-based answers.
 *
 * - provideToolReasoningTransparency - A function that orchestrates the process of generating
 *   responses with tool usage transparency.
 * - ProvideToolReasoningTransparencyInput - The input type for the provideToolReasoningTransparency function.
 * - ProvideToolReasoningTransparencyOutput - The return type for the provideToolReasoningTransparency function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define schemas for input and output
const ProvideToolReasoningTransparencyInputSchema = z.object({
  query: z.string().describe('The user query.'),
});
export type ProvideToolReasoningTransparencyInput = z.infer<typeof ProvideToolReasoningTransparencyInputSchema>;

const ProvideToolReasoningTransparencyOutputSchema = z.object({
  response: z.string().describe('The response from the AI, including tool usage information.'),
  toolUsages: z.array(
    z.object({
      toolName: z.string().describe('The name of the tool used.'),
      input: z.record(z.any()).describe('The input to the tool.'),
      output: z.record(z.any()).describe('The output from the tool.'),
      citation: z.string().optional().describe('Optional citation for the tool usage.'),
    })
  ).optional().describe('Information about the tools used, if any.'),
});
export type ProvideToolReasoningTransparencyOutput = z.infer<typeof ProvideToolReasoningTransparencyOutputSchema>;


export async function provideToolReasoningTransparency(input: ProvideToolReasoningTransparencyInput): Promise<ProvideToolReasoningTransparencyOutput> {
  return provideToolReasoningTransparencyFlow(input);
}

// Define the prompt
const provideToolReasoningTransparencyPrompt = ai.definePrompt({
  name: 'provideToolReasoningTransparencyPrompt',
  input: {schema: ProvideToolReasoningTransparencyInputSchema},
  output: {schema: ProvideToolReasoningTransparencyOutputSchema},
  prompt: `You are an AI assistant that provides transparent reasoning for your answers, especially when using tools.

  When answering the user's query, if you use any tools, clearly state which tools you used, the input you provided to the tool, and the output you received from the tool.
  If the tool provides a citation or source, include that as well.
  Present this information in a structured and easy-to-understand format.

  User Query: {{{query}}}
  `,config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

// Define the flow
const provideToolReasoningTransparencyFlow = ai.defineFlow(
  {
    name: 'provideToolReasoningTransparencyFlow',
    inputSchema: ProvideToolReasoningTransparencyInputSchema,
    outputSchema: ProvideToolReasoningTransparencyOutputSchema,
  },
  async input => {
    const {output} = await provideToolReasoningTransparencyPrompt(input);
    return output!;
  }
);
