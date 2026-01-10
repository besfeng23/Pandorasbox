/**
 * Genkit Runtime Entry Point for Firebase App Hosting
 * 
 * This initializes Genkit with Firebase integration for App Hosting.
 * Genkit runs within the App Hosting runtime environment.
 */
import { genkit } from "genkit";
import { vertexAI } from "@genkit-ai/vertexai";
import { enableFirebaseTelemetry } from "@genkit-ai/firebase";

// Enable Firebase telemetry for observability
enableFirebaseTelemetry();

// Initialize Genkit with Vertex AI plugin
// Location set to us-central1 for best model availability
export const ai = genkit({
  plugins: [vertexAI({ location: 'us-central1' })],
  enableFlowControl: true,
  logLevel: "info",
});
