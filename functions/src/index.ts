
import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import OpenAI from "openai";

admin.initializeApp();
const firestore = admin.firestore();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o',
          messages: [
            {
              role: "system",
              content: "You are an Executive Assistant. Review the user's Current Context. Identify 'Open Loops', 'Pending Decisions', or 'Focus Areas'. Generate a concise, 3-bullet Morning Briefing to help them start the day."
            },
            {
              role: "user",
              content: `User's Current Context: "${userContext}"`
            }
          ]
        });

        const briefing = completion.choices[0].message.content;

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