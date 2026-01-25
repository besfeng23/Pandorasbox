import OpenAI from 'openai';

// Support both INFERENCE_BASE_URL (preferred) and INFERENCE_URL (legacy)
// INFERENCE_BASE_URL might not include /v1, so we handle both cases
const baseUrl = process.env.INFERENCE_BASE_URL || process.env.INFERENCE_URL || 'http://localhost:8000';
const INFERENCE_URL = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;
const SOVEREIGN_KEY = process.env.SOVEREIGN_KEY || 'empty';

// Enforce Sovereign Architecture: Local vLLM only.
export const openai = new OpenAI({
  baseURL: INFERENCE_URL,
  apiKey: SOVEREIGN_KEY,
  dangerouslyAllowBrowser: true // Only if needed on client, but this is server-side lib
});

export const INFERENCE_MODEL = process.env.INFERENCE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function streamInference(messages: ChatMessage[]) {
  try {
    const stream = await openai.chat.completions.create({
      model: INFERENCE_MODEL,
      messages: messages,
      stream: true,
      temperature: 0.7,
    });
    return stream;
  } catch (error) {
    console.error('Sovereign Inference Error:', error);
    throw new Error('Inference System Offline - Check Container.');
  }
}

