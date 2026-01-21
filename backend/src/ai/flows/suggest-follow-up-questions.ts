'use server';

import { z } from 'zod';
import { chatCompletion } from '@/server/inference-client';

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
  const { userMessage, aiResponse } = input;
  const prompt = `Given the following user message and AI response, suggest three follow-up questions that the user could ask to explore the topic further and refine the AI's understanding of their needs.

User Message: ${userMessage}
AI Response: ${aiResponse}

Return ONLY a JSON array of 3 strings. e.g. ["question 1", "question 2", "question 3"]`;

  try {
    const completion = await chatCompletion({
      messages: [{ role: 'user', content: prompt }],
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return [];
    }

    // Attempt to extract JSON array if it's wrapped in text
    const jsonMatch = content.match(/\[.*\]/s);
    const jsonStr = jsonMatch ? jsonMatch[0] : content;

    const result = JSON.parse(jsonStr);
    if (Array.isArray(result)) {
      return result.slice(0, 3);
    }
    if (typeof result === 'object' && result !== null) {
      const key = Object.keys(result)[0];
      if (key && Array.isArray(result[key])) {
        return result[key].slice(0, 3);
      }
    }
    return [];
  } catch (e) {
    console.error('Failed to parse suggestions:', e);
    return [];
  }
}
