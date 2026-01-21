'use server';

/**
 * @fileOverview Summarizes long chat histories to provide users with quick summaries.
 *
 * - summarizeLongChat - A function that summarizes a long chat history.
 * - SummarizeLongChatInput - The input type for the summarizeLongChat function.
 * - SummarizeLongChatOutput - The return type for the summarizeLongChat function.
 */

import { z } from 'zod';
import { chatCompletion } from '@/server/inference-client';

const SummarizeLongChatInputSchema = z.object({
  chatHistory: z.string().describe('The complete chat history to summarize.'),
});
export type SummarizeLongChatInput = z.infer<typeof SummarizeLongChatInputSchema>;

const SummarizeLongChatOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the chat history.'),
});
export type SummarizeLongChatOutput = z.infer<typeof SummarizeLongChatOutputSchema>;

export async function summarizeLongChat(input: SummarizeLongChatInput): Promise<SummarizeLongChatOutput> {
  const { chatHistory } = input;
  
  const prompt = `You are an AI assistant designed to summarize long chat histories.

Please provide a concise and informative summary of the following chat history:

${chatHistory}

Summary:`;

  try {
    const completion = await chatCompletion({
      messages: [{ role: 'user', content: prompt }],
    });

    const summary = completion.choices[0].message.content?.trim() || 'No summary available.';
    return { summary };
  } catch (error) {
    console.error('Failed to summarize chat:', error);
    return { summary: 'Error generating summary.' };
  }
}
