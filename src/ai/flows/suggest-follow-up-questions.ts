'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Please set it in your environment variables.');
  }
  return new OpenAI({ apiKey });
}

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

    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
    });

    const content = completion.choices[0].message.content;
    if (!content) {
      return [];
    }

    try {
      // The prompt asks for an array, but the model might wrap it in an object.
      // We handle both cases.
      const result = JSON.parse(content);
      if (Array.isArray(result)) {
        return result.slice(0, 3);
      }
      if (typeof result === 'object' && result !== null) {
          const key = Object.keys(result)[0];
          if (key && Array.isArray(result[key])) {
              return result[key].slice(0,3);
          }
      }
      return [];
    } catch (e) {
      console.error('Failed to parse suggestions:', e);
      return [];
    }
  }
);
