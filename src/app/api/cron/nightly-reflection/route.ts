import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreAdmin } from '@/lib/firebase-admin';
import { runReflectionFlow } from '@/ai/agents/nightly-reflection';
import { saveInsightMemory, saveQuestionMemory } from '@/lib/memory-utils';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * API route for nightly reflection agent.
 * This should be called by Cloud Scheduler or a cron service.
 * 
 * To set up Cloud Scheduler:
 * 1. Go to Google Cloud Console > Cloud Scheduler
 * 2. Create a new job that calls this endpoint daily at 3 AM UTC
 * 3. Use your App Hosting URL: https://your-app-url/api/cron/nightly-reflection
 * 4. Add a secret header for security (optional but recommended)
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Verify the request is from Cloud Scheduler
    // const authHeader = request.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const firestoreAdmin = getFirestoreAdmin();
    
    // Get all users from the users collection
    // Note: This assumes users are stored in Firestore. If not, consider using Firebase Auth's listUsers() instead
    // For optimization, you could filter for users with recent activity (e.g., last 7 days)
    const usersSnapshot = await firestoreAdmin.collection('users').get();
    
    if (usersSnapshot.empty) {
      return NextResponse.json({ 
        success: true, 
        message: 'No users found.',
        processed: 0,
        insightsCreated: 0,
        questionsCreated: 0,
        errors: 0,
      });
    }

    let processed = 0;
    let insightsCreated = 0;
    let questionsCreated = 0;
    let errors = 0;
    const errorDetails: string[] = [];

    // Process each user
    for (const userDoc of usersSnapshot.docs) {
      const userId = userDoc.id;
      
      try {
        console.log(`[NightlyReflection] Processing user ${userId}...`);
        
        // Run reflection flow
        const reflectionResult = await runReflectionFlow({ userId });
        
        if (reflectionResult.processedCount === 0) {
          console.log(`[NightlyReflection] User ${userId} has no interactions to analyze`);
          continue;
        }

        // Save insights as memories with type: 'insight'
        for (const insight of reflectionResult.insights) {
          if (insight && insight.trim()) {
            try {
              const result = await saveInsightMemory(
                insight.trim(),
                userId,
                {
                  reflectionDate: FieldValue.serverTimestamp(),
                  processedCount: reflectionResult.processedCount,
                }
              );
              
              if (result.success) {
                insightsCreated++;
                console.log(`[NightlyReflection] Created insight for user ${userId}: ${insight.substring(0, 50)}...`);
              }
            } catch (error: any) {
              console.error(`[NightlyReflection] Failed to save insight for user ${userId}:`, error);
            }
          }
        }

        // Save weak answer as memory with type: 'question_to_ask'
        if (reflectionResult.weakAnswer && reflectionResult.weakAnswer.topic && reflectionResult.weakAnswer.question) {
          try {
            const result = await saveQuestionMemory(
              reflectionResult.weakAnswer.question,
              userId,
              reflectionResult.weakAnswer.topic,
              {
                reflectionDate: FieldValue.serverTimestamp(),
                processedCount: reflectionResult.processedCount,
              }
            );
            
            if (result.success) {
              questionsCreated++;
              console.log(`[NightlyReflection] Created question for user ${userId}: ${reflectionResult.weakAnswer.topic}`);
            }
          } catch (error: any) {
            console.error(`[NightlyReflection] Failed to save question for user ${userId}:`, error);
          }
        }

        processed++;
        console.log(`[NightlyReflection] Completed reflection for user ${userId}: ${reflectionResult.insights.length} insights, ${reflectionResult.weakAnswer ? 1 : 0} questions`);
        
      } catch (error: any) {
        errors++;
        const errorMsg = `User ${userId}: ${error.message || String(error)}`;
        errorDetails.push(errorMsg);
        console.error(`[NightlyReflection] Failed to process user ${userId}:`, error);
        // Continue processing other users
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      insightsCreated,
      questionsCreated,
      errors,
      errorDetails: errorDetails.length > 0 ? errorDetails : undefined,
      message: `Nightly reflection complete. Processed ${processed} users, created ${insightsCreated} insights and ${questionsCreated} questions. ${errors} errors.`,
    });
  } catch (error: any) {
    console.error('[NightlyReflection] Fatal error:', error);
    return NextResponse.json(
      { error: 'Nightly reflection failed', details: error.message },
      { status: 500 }
    );
  }
}

// Also support GET for manual testing
export async function GET(request: NextRequest) {
  return POST(request);
}

