// This file implements the SuggestFollowUpQuestions flow, which suggests follow-up questions to help users explore a topic further.

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestFollowUpQuestionsInputSchema = z.object({
  userMessage: z.string().describe('The user message.'),
  aiResponse: z.string().describe('The AI response.'),
});
export type SuggestFollowUpQuestionsInput = z.infer<
  typeof SuggestFollowUpQuestionsInputSchema
>;

const SuggestFollowUpQuestionsOutputSchema = z.array(
  z.string().describe('A suggested follow-up question.')
);
export type SuggestFollowUpQuestionsOutput = z.infer<
  typeof SuggestFollowUpQuestionsOutputSchema
>;

export async function suggestFollowUpQuestions(
  input: SuggestFollowUpQuestionsInput
): Promise<SuggestFollowUpQuestionsOutput> {
  return suggestFollowUpQuestionsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestFollowUpQuestionsPrompt',
  input: {schema: SuggestFollowUpQuestionsInputSchema},
  output: {schema: SuggestFollowUpQuestionsOutputSchema},
  prompt: `Given the following user message and AI response, suggest three follow-up questions that the user could ask to explore the topic further and refine the AI's understanding of their needs.

User Message: {{{userMessage}}}
AI Response: {{{aiResponse}}}

Follow-up Questions:
1.`,
});

const suggestFollowUpQuestionsFlow = ai.defineFlow(
  {
    name: 'suggestFollowUpQuestionsFlow',
    inputSchema: SuggestFollowUpQuestionsInputSchema,
    outputSchema: SuggestFollowUpQuestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
