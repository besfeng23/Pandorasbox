import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY?.trim(),
});

/**
 * API route for daily briefing generation.
 * This should be called by Cloud Scheduler or a cron service.
 * 
 * To set up Cloud Scheduler:
 * 1. Go to Google Cloud Console > Cloud Scheduler
 * 2. Create a new job that calls this endpoint daily at 8 AM EST
 * 3. Use your App Hosting URL: https://your-app-url/api/cron/daily-briefing
 * 4. Add a secret header for security (see cleanup route for example)
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify the request is from Cloud Scheduler
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const firestoreAdmin = getFirestoreAdmin();
    const usersSnapshot = await firestoreAdmin.collection("users").get();
    
    if (usersSnapshot.empty) {
      return NextResponse.json({ 
        success: true, 
        message: "No users found.",
        processed: 0 
      });
    }

    let processed = 0;
    let errors = 0;

    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      try {
        const contextDoc = await firestoreAdmin
          .collection("users")
          .doc(userId)
          .collection("state")
          .doc("context")
          .get();

        if (!contextDoc.exists) {
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
          await firestoreAdmin
            .collection("users")
            .doc(userId)
            .collection("history")
            .add({
              role: "assistant",
              type: "briefing",
              content: briefing,
              timestamp: firestoreAdmin.FieldValue.serverTimestamp(),
            });
          processed++;
        }
      } catch (error: any) {
        console.error(`Failed to process user ${userId}:`, error);
        errors++;
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      errors,
      message: `Daily briefing complete. Processed ${processed} users, ${errors} errors.`,
    });
  } catch (error: any) {
    console.error('Error during daily briefing:', error);
    return NextResponse.json(
      { error: 'Daily briefing failed', details: error.message },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}

