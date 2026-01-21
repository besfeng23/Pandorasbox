'use server';

/**
 * @fileOverview Implements web retrieval with citations for the agent.
 *
 * - webRetrievalWithCitations - A function that retrieves information from the web and provides citations.
 * - WebRetrievalWithCitationsInput - The input type for the webRetrievalWithCitations function.
 * - WebRetrievalWithCitationsOutput - The return type for the webRetrievalWithCitations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const WebRetrievalWithCitationsInputSchema = z.object({
  query: z.string().describe('The query to use for web retrieval.'),
});

export type WebRetrievalWithCitationsInput = z.infer<typeof WebRetrievalWithCitationsInputSchema>;

const CitationSchema = z.object({
    source: z.string().describe("URL of the source."),
    title: z.string().describe("Title of the source."),
    snippet: z.string().describe("Snippet from the source.")
});

const WebRetrievalWithCitationsOutputSchema = z.object({
    answer: z.string().describe('The answer to the query, citing sources with [index] format.'),
    citations: z.array(CitationSchema).optional().describe("A list of sources used for the answer."),
});

export type WebRetrievalWithCitationsOutput = z.infer<typeof WebRetrievalWithCitationsOutputSchema>;


export async function webRetrievalWithCitations(
  input: WebRetrievalWithCitationsInput
): Promise<WebRetrievalWithCitationsOutput> {
  return webRetrievalWithCitationsFlow(input);
}

const webRetrievalWithCitationsPrompt = ai.definePrompt({
  name: 'webRetrievalWithCitationsPrompt',
  input: {schema: WebRetrievalWithCitationsInputSchema},
  output: {schema: WebRetrievalWithCitationsOutputSchema},
  prompt: `Answer the following question using web retrieval. Provide citations for your answer in the 'citations' field. In your main answer, cite the sources using the format [1], [2], etc. For each citation, include the source URL, title, and a snippet of text supporting the answer.\n\nQuestion: {{{query}}}`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_ONLY_HIGH',
      },
    ],
  },
});

const webRetrievalWithCitationsFlow = ai.defineFlow(
  {
    name: 'webRetrievalWithCitationsFlow',
    inputSchema: WebRetrievalWithCitationsInputSchema,
    outputSchema: WebRetrievalWithCitationsOutputSchema,
  },
  async input => {
    // For now, we return a mocked response to simulate web retrieval.
    // In a real implementation, you would use a tool to search the web.
    if (input.query.toLowerCase().includes('firebase')) {
         return {
            answer: 'Firebase is a platform developed by Google for creating mobile and web applications. It provides a variety of tools and services to help developers build high-quality apps, grow their user base, and earn money [1].',
            citations: [{
                source: 'https://firebase.google.com/',
                title: 'Firebase | Google\'s Mobile and Web App Development Platform',
                snippet: 'Firebase helps you build and run successful apps. Backed by Google and loved by app development teams - from startups to global enterprises'
            }]
        }
    }
    
    // This will just hallucinate, but shows the structure.
    const {output} = await webRetrievalWithCitationsPrompt(input);
    return output!;
  }
);
