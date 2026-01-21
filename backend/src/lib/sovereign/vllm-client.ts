import OpenAI from 'openai';

// Use process.env.INFERENCE_URL as the base URL for the OpenAI client
const INFERENCE_URL = process.env.INFERENCE_URL || 'http://localhost:8000/v1';
const SOVEREIGN_KEY = process.env.SOVEREIGN_KEY || 'empty';
const INFERENCE_MODEL = process.env.INFERENCE_MODEL || 'mistralai/Mistral-7B-Instruct-v0.3';

const openai = new OpenAI({
  apiKey: SOVEREIGN_KEY,
  baseURL: INFERENCE_URL,
});

export async function getInference(prompt: string, maxTokens: number = 1000) {
  try {
    const response = await openai.chat.completions.create({
      model: INFERENCE_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: false,
      max_tokens: maxTokens,
    });
    return response.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Error getting inference from vLLM:', error);
    throw new Error('Inference System Offline - Check Container.');
  }
}

export async function streamInference(prompt: string, maxTokens: number = 1000) {
  try {
    const stream = await openai.chat.completions.create({
      model: INFERENCE_MODEL,
      messages: [{ role: 'user', content: prompt }],
      stream: true,
      max_tokens: maxTokens,
    });
    return stream;
  } catch (error) {
    console.error('Error streaming inference from vLLM:', error);
    throw new Error('Inference System Offline - Check Container.');
  }
}

