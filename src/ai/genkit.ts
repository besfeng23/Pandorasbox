/**
 * Genkit Runtime Entry Point for Firebase App Hosting
 * 
 * This initializes Genkit with Firebase integration for App Hosting.
 * Genkit runs within the App Hosting runtime environment.
 */
import { genkit } from "genkit";
import { googleAI } from "@genkit-ai/google-genai";
import { enableFirebaseTelemetry } from "@genkit-ai/firebase";

// Enable Firebase telemetry for observability
enableFirebaseTelemetry();

// Initialize Genkit with Google AI plugin
// Location matches Firestore region: asia-southeast1
export const ai = genkit({
  plugins: [googleAI()],
  enableFlowControl: true,
  logLevel: "info",
});
