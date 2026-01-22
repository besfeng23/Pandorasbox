/**
 * Nightly Reflection Agent
 * 
 * Analyzes recent user interactions to extract insights and identify areas for improvement.
 * This "offline learning" system helps the AI get smarter over time by consolidating
 * patterns and learnings from user interactions.
 */

'use server';

import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { z } from 'zod';
import admin from 'firebase-admin';
import { chatCompletion } from '@/server/inference-client';

const ReflectionInputSchema = z.object({
  userId: z.string(),
});

const ReflectionOutputSchema = z.object({
  insights: z.array(z.string()),
  weakAnswer: z.object({
    topic: z.string(),
    question: z.string(),
  }).nullable(),
  processedCount: z.number(),
});

/**
 * Reflection Flow - Analyzes user interactions and extracts insights
 */
export async function runReflectionFlow(
  input: z.infer<typeof ReflectionInputSchema>
): Promise<z.infer<typeof ReflectionOutputSchema>> {
  const { userId } = input;
  const firestoreAdmin = getFirestoreAdmin();
  
  try {
    // Fetch last 50 messages from history
    const historySnapshot = await firestoreAdmin
      .collection('history')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    // Fetch last 50 memories
    const memoriesSnapshot = await firestoreAdmin
      .collection('memories')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    // Combine and format interactions
    const interactions: string[] = [];

    // Add history messages
    historySnapshot.docs.reverse().forEach(doc => {
      const data = doc.data();
      const role = data.role === 'user' ? 'User' : 'Assistant';
      const timestamp = data.createdAt instanceof admin.firestore.Timestamp 
        ? data.createdAt.toDate().toISOString() 
        : new Date().toISOString();
      interactions.push(`[${timestamp}] ${role}: ${data.content || ''}`);
    });

    // Add memories (excluding insights to avoid circular analysis)
    memoriesSnapshot.docs.reverse().forEach(doc => {
      const data = doc.data();
      if (data.type !== 'insight' && data.type !== 'question_to_ask') {
        const timestamp = data.createdAt && typeof data.createdAt.toDate === 'function'
          ? data.createdAt.toDate().toISOString() 
          : new Date().toISOString();
        interactions.push(`[${timestamp}] Memory: ${data.content || ''}`);
      }
    });

    const processedCount = interactions.length;

    if (processedCount === 0) {
      return {
        insights: [],
        weakAnswer: null,
        processedCount: 0,
      };
    }

    // Prepare interaction text for analysis
    const interactionsText = interactions.join('\n\n');

    // Use LLM to analyze and extract insights
    const completion = await chatCompletion({
      messages: [
        {
          role: 'system',
          content: `You are a reflection agent analyzing user interactions to improve future AI responses.

Your task is to:
1. Identify 3 key facts you learned about the user (preferences, patterns, context, recurring themes)
2. Identify 1 area where the AI gave a weak, incomplete, or unsatisfactory answer
3. Consolidate specific details into broader, reusable insights

Format requirements:
- Insights should be concise, searchable phrases (10-30 words each)
- Focus on patterns and learnings that will help in future conversations
- Weak answers should identify the topic and suggest a question to ask the user

Return ONLY a JSON object with:
- "insights": array of 3 insight strings
- "weakAnswer": object with "topic" (string) and "question" (string), or null if none found`
        },
        {
          role: 'user',
          content: `Analyze these recent user interactions:\n\n${interactionsText}\n\nExtract insights and identify weak answers.`
        }
      ],
    });

    const responseText = completion.choices[0].message.content || '{}';
    
    // Attempt to extract JSON object if it's wrapped in text
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const jsonStr = jsonMatch ? jsonMatch[0] : responseText;
    
    const responseData = JSON.parse(jsonStr);

    return {
      insights: Array.isArray(responseData.insights) ? responseData.insights : [],
      weakAnswer: responseData.weakAnswer && typeof responseData.weakAnswer === 'object'
        ? {
            topic: responseData.weakAnswer.topic || '',
            question: responseData.weakAnswer.question || '',
          }
        : null,
      processedCount,
    };
  } catch (error: any) {
    console.error(`[ReflectionFlow] Error for user ${userId}:`, error);
    throw error;
  }
}
