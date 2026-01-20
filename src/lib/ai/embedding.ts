'use server';

import OpenAI from 'openai';

// Lazy initialization to avoid build-time errors
let openai: OpenAI | null = null;
function getOpenAI() {
  if (openai) return openai;
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not configured. Please set it in your environment variables.');
  }
  openai = new OpenAI({ apiKey });
  return openai;
}

/**
 * Generates an embedding for the given text using OpenAI's embedding model.
 * @param text The text to generate an embedding for.
 * @returns The embedding vector.
 */
export async function embedText(text: string): Promise<number[]> {
  const normalizedText = text.trim().toLowerCase();
  if (!normalizedText) {
    return Array(1536).fill(0);
  }

  const openaiClient = getOpenAI();
  const response = await openaiClient.embeddings.create({
    model: 'text-embedding-3-small',
    input: normalizedText,
  });
  return response.data[0].embedding;
}

