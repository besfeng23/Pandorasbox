import { genkit } from 'genkit';
import { vertexAI } from '@genkit-ai/vertexai';

// This is a LOCAL Genkit configuration for the Cloud Function.
// It is separate from the main application's Genkit config.
export const ai = genkit({
  plugins: [vertexAI({ location: 'us-central1' })],
  enableFlowControl: true,
  logLevel: "info",
});
