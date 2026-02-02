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

  // Debug logging
  console.log('[Sovereign Inference] Initializing OpenAI client:', {
    baseUrl,
    inferenceUrl: INFERENCE_URL,
    hasApiKey: !!SOVEREIGN_KEY && SOVEREIGN_KEY !== 'empty',
    model: process.env.INFERENCE_MODEL || 'mistral'
  });

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
    console.log('[Sovereign Inference] Creating stream with model:', INFERENCE_MODEL, 'Messages:', messages.length);
    const stream = await openai.chat.completions.create({
      model: INFERENCE_MODEL,
      messages: messages,
      stream: true,
      temperature: 0.7,
    });
    console.log('[Sovereign Inference] Stream created successfully');
    return stream;
  } catch (error: any) {
    throw new Error(`AI Inference Engine Offline - ${error.message || 'Check Container status'}`);
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
    console.log('[Sovereign Inference] Creating completion with model:', INFERENCE_MODEL, 'Temperature:', temperature);
    const completion = await openai.chat.completions.create({
      model: INFERENCE_MODEL,
      messages: messages,
      stream: false,
      temperature: temperature,
      max_tokens: 500, // Limit for summaries
    });

    const content = completion.choices[0]?.message?.content || '';
    console.log('[Sovereign Inference] Completion received, length:', content.length);
    return content;
  } catch (error: any) {
    throw new Error(`AI Inference Engine Offline - ${error.message || 'Check Container status'}`);
  }
}

