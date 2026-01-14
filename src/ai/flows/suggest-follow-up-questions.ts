'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';

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

const suggestFollowUpQuestionsFlow = ai.defineFlow(
  {
    name: 'suggestFollowUpQuestionsFlow',
    inputSchema: SuggestFollowUpQuestionsInputSchema,
    outputSchema: SuggestFollowUpQuestionsOutputSchema,
  },
  async ({ userMessage, aiResponse }) => {
    const prompt = `Given the following user message and AI response, suggest three follow-up questions that the user could ask to explore the topic further and refine the AI's understanding of their needs.

User Message: ${userMessage}
AI Response: ${aiResponse}

Return a JSON array of 3 strings. e.g. ["question 1", "question 2", "question 3"]`;

    try {
      const completion = await ai.generate({
        model: 'vertexai/gemini-1.5-flash',
        prompt: [{ text: prompt }],
        config: { temperature: 0.7 },
        output: { format: 'json' }
      });

      const result = completion.output;

      if (Array.isArray(result)) {
        return result.slice(0, 3) as string[];
      }
      if (typeof result === 'object' && result !== null) {
          // Sometimes models wrap array in an object key like "questions"
          const values = Object.values(result);
          const arrayVal = values.find(v => Array.isArray(v));
          if (arrayVal) {
              return (arrayVal as string[]).slice(0, 3);
          }
      }
      return [];
    } catch (e) {
      console.error('Failed to parse suggestions:', e);
      return [];
    }
  }
);
