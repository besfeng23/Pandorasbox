import OpenAI from 'openai';

// Support both INFERENCE_BASE_URL (preferred) and INFERENCE_URL (legacy)
// INFERENCE_BASE_URL might not include /v1, so we handle both cases
// Lazy client getter
const getOpenAI = () => {
  const baseUrl = process.env.INFERENCE_BASE_URL || process.env.INFERENCE_URL || 'http://localhost:8000';
  // Ensure /v1 is appended for OpenAI-compatible API (works for both Ollama and vLLM)
  let INFERENCE_URL: string;
  if (baseUrl.endsWith('/v1')) {
    INFERENCE_URL = baseUrl;
  } else if (baseUrl.includes('/') && !baseUrl.match(/:\d+$/)) {
    // URL has a path already, append /v1
    INFERENCE_URL = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) + '/v1' : baseUrl + '/v1';
  } else {
    // Plain host:port, append /v1
    INFERENCE_URL = `${baseUrl}/v1`;
  }
  const SOVEREIGN_KEY = process.env.SOVEREIGN_KEY || 'empty';

  return new OpenAI({
    baseURL: INFERENCE_URL,
    apiKey: SOVEREIGN_KEY,
    dangerouslyAllowBrowser: true
  });
};

// Default to 'mistral' for Ollama compatibility, but allow override for vLLM
export const INFERENCE_MODEL = process.env.INFERENCE_MODEL || 'mistral';

export type ChatMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export async function streamInference(messages: ChatMessage[]) {
  try {
    const openai = getOpenAI();
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

/**
 * Non-streaming inference for summarization and metadata extraction
 * @param messages Array of chat messages
 * @param temperature Temperature for generation (default: 0.3 for more focused summaries)
 * @returns The complete response text
 */
export async function completeInference(
  messages: ChatMessage[],
  temperature: number = 0.3
): Promise<string> {
  try {
    const openai = getOpenAI();
    const completion = await openai.chat.completions.create({
      model: INFERENCE_MODEL,
      messages: messages,
      stream: false,
      temperature: temperature,
      max_tokens: 500, // Limit for summaries
    });

    return completion.choices[0]?.message?.content || '';
  } catch (error) {
    console.error('Sovereign Inference Error (non-streaming):', error);
    throw new Error('Inference System Offline - Check Container.');
  }
}

