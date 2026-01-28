'use server';

/**
 * @fileOverview Implements cross-thread search functionality using Genkit.
 *
 * This file defines a Genkit flow that enables users to perform keyword and semantic searches
 * across all their threads and agents to find specific information or relevant discussions.
 *
 * @interface CrossThreadSearchInput - Defines the input schema for the cross-thread search flow.
 * @interface CrossThreadSearchOutput - Defines the output schema for the cross-thread search flow.
 * @function crossThreadSearch - The exported function to initiate the cross-thread search flow.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const CrossThreadSearchInputSchema = z.object({
  query: z.string().describe('The search query provided by the user.'),
  dateRangeStart: z.string().optional().describe('The start date for the search range (ISO format).'),
  dateRangeEnd: z.string().optional().describe('The end date for the search range (ISO format).'),
  agent: z.string().optional().describe('The agent to filter the search by (e.g., Builder, Universe).'),
  tags: z.array(z.string()).optional().describe('An array of tags to filter the search by.'),
  pinned: z.boolean().optional().describe('Whether to only include pinned messages in the search.'),
  source: z.string().optional().describe('The source of the message (e.g., user, assistant).'),
});

export type CrossThreadSearchInput = z.infer<typeof CrossThreadSearchInputSchema>;

const CrossThreadSearchOutputSchema = z.object({
  results: z.array(
    z.object({
      threadId: z.string().describe('The ID of the thread the message belongs to.'),
      messageId: z.string().describe('The ID of the message.'),
      agent: z.string().describe('The agent associated with the message.'),
      content: z.string().describe('The content of the message.'),
      createdAt: z.string().describe('The creation timestamp of the message (ISO format).'),
    })
  ).describe('An array of search results, each containing message details.'),
});

export type CrossThreadSearchOutput = z.infer<typeof CrossThreadSearchOutputSchema>;

const crossThreadSearchPrompt = ai.definePrompt({
  name: 'crossThreadSearchPrompt',
  input: {schema: CrossThreadSearchInputSchema},
  output: {schema: CrossThreadSearchOutputSchema},
  prompt: `You are a search assistant designed to find relevant messages across multiple chat threads.

  Given a user's query and optional filters, search through the available messages and return the most relevant results.

  Query: {{{query}}}

  {{#if dateRangeStart}}
  Date Range Start: {{{dateRangeStart}}}
  {{/if}}

  {{#if dateRangeEnd}}
  Date Range End: {{{dateRangeEnd}}}
  {{/if}}

  {{#if agent}}
  Agent: {{{agent}}}
  {{/if}}

  {{#if tags}}
  Tags: {{#each tags}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
  {{/if}}

  {{#if pinned}}
  Pinned Only: {{{pinned}}}
  {{/if}}

  {{#if source}}
  Source: {{{source}}}
  {{/if}}

  Return the results in the following JSON format:
  {{json results=[{threadId: string, messageId: string, agent: string, content: string, createdAt: string}]}}`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const crossThreadSearchFlow = ai.defineFlow({
    name: 'crossThreadSearchFlow',
    inputSchema: CrossThreadSearchInputSchema,
    outputSchema: CrossThreadSearchOutputSchema,
  },
  async input => {
    // TODO: Integrate with Firestore to fetch and filter messages based on the input criteria.
    // For now, return a placeholder result.
    const {output} = await crossThreadSearchPrompt(input);
    return output!;
  }
);

export async function crossThreadSearch(input: CrossThreadSearchInput): Promise<CrossThreadSearchOutput> {
  return crossThreadSearchFlow(input);
}
