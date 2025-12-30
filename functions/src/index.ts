
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { ai } from "./genkit-local";

admin.initializeApp();
const firestore = admin.firestore();

export const dailyBriefingAgent = functions
  .runWith({
    secrets: ["OPENAI_API_KEY"],
  })
  .pubsub.schedule("every day 08:00")
  .timeZone("America/New_York")
  .onRun(async (context) => {
    console.log("Executing Daily Briefing Agent.");

    const usersSnapshot = await firestore.collection("users").get();
    if (usersSnapshot.empty) {
      console.log("No users found.");
      return null;
    }

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      console.log(`Processing user: ${userId}`);

      try {
        const contextDoc = await firestore
          .collection("users")
          .doc(userId)
          .collection("state")
          .doc("context")
          .get();

        if (!contextDoc.exists) {
          console.log(`No context found for user ${userId}. Skipping.`);
          continue;
        }

        const userContext = contextDoc.data()?.note || "No context available.";

        const completion = await ai.generate({
          model: 'googleai/gpt-4o',
          system: "You are an Executive Assistant. Review the user's Current Context. Identify 'Open Loops', 'Pending Decisions', or 'Focus Areas'. Generate a concise, 3-bullet Morning Briefing to help them start the day.",
          prompt: `User's Current Context: "${userContext}"`,
        });

        const briefing = completion.text;

        if (briefing) {
          await firestore
            .collection("users")
            .doc(userId)
            .collection("history")
            .add({
              role: "assistant",
              type: "briefing",
              content: briefing,
              timestamp: admin.firestore.FieldValue.serverTimestamp(),
            });
          console.log(`Briefing generated for user ${userId}.`);
        } else {
          console.log(`No briefing generated for user ${userId}.`);
        }
      } catch (error) {
        console.error(`Failed to process user ${userId}:`, error);
      }
    }

    return null;
  });

