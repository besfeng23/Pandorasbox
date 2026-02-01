/**
 * TEST SCRIPT: Three-Brain Dispatcher Logic
 */
import { DispatcherService } from '../src/lib/ai/dispatcher';
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testDispatcher() {
    const dispatcher = new DispatcherService();

    const testQueries = [
        "How do I implement a debounced search in React with TypeScript?",
        "Tell me a story about a sentient cloud that falls in love with a mountain.",
        "What is the most efficient way to partition a PostgreSQL table for 1B records?",
        "What is the meaning of life if we are all just stardust?",
        "Can you help me roleplay as a tavern keeper in a dark fantasy world?"
    ];

    console.log('--- THREE-BRAIN DISPATCHER TEST ---');

    for (const query of testQueries) {
        console.log(`\nQuery: "${query}"`);
        try {
            const result = await dispatcher.classifyIntent(query);
            console.log(`Target: [${result.target}]`);
            console.log(`Reason: ${result.reason}`);
        } catch (err: any) {
            console.error(`Error: ${err.message}`);
        }
    }
}

testDispatcher();
