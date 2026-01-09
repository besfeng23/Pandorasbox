/**
 * Genkit Runtime Entry Point for Firebase App Hosting
 * 
 * This initializes Genkit with Firebase integration for App Hosting.
 * Genkit runs within the App Hosting runtime environment.
 */
import { start } from "@genkit-ai/firebase";
import { google } from "@genkit-ai/google-genai";

// Initialize Genkit with Firebase and Google AI plugins
// Location matches Firestore region: asia-southeast1
start({
  plugins: [google()],
  location: "asia-southeast1"
});
