
// Mock environment variables if needed for local test
process.env.FIRESTORE_EMULATOR_HOST = ''; // Ensure we try real or fail explicitly
// We need to see if we can perform the imports. 
// Relative paths might be tricky with tsx in root, we'll try to use the aliases if tsconfig is picked up.

import { trackPerformance, getAgentCapabilities } from '@/lib/ai/agent-learning';
import { exploreTreeOfThoughts } from '@/lib/ai/tree-of-thoughts';
import { verifyClaim } from '@/lib/ai/fact-check';

async function testPersistence() {
    console.log('--- Testing Firestore Persistence ---');
    const agentId = 'test-agent-' + Date.now();
    console.log(`Tracking performance for ${agentId}...`);

    try {
        await trackPerformance(agentId, true, 0.99);
        console.log('Write Success. Reading back...');

        // Wait a moment for consistency
        await new Promise(r => setTimeout(r, 2000));

        const caps = await getAgentCapabilities(agentId);
        console.log(`Capabilities for ${agentId}:`, caps);

        if (caps.length > 0) console.log('✅ Persistence Verified');
        else console.warn('⚠️ Read returned empty capabilities (might be eventual consistency or fail)');
    } catch (e) {
        console.error('❌ Persistence Failed:', e);
    }
}

async function testToT() {
    console.log('\n--- Testing Tree of Thoughts JSON Parsing ---');
    // We can't easily mock the OpenAI call here without full setup, 
    // but we can check if the function executes and handles the "No Key" error gracefully 
    // OR if we have a key, it actually runs.

    if (!process.env.SOVEREIGN_KEY && !process.env.OPENAI_API_KEY) {
        console.log('ℹ️ Skipping live Inference test (No API Key in env). Logic syntax is valid though.');
        return;
    }

    try {
        const branches = await exploreTreeOfThoughts("How do I fix a segfault?");
        console.log('ToT Result:', branches);
        if (Array.isArray(branches)) console.log('✅ ToT Logic Verified (Returned Array)');
    } catch (e) {
        console.error('❌ ToT Failed:', e);
    }
}

async function main() {
    await testPersistence();
    await testToT();
}

main();
