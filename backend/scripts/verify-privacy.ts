
import { indexMemory, searchMemories } from '../src/lib/vector-store';
import { v4 as uuidv4 } from 'uuid';

async function runPrivacyTest() {
    console.log('🔒 Starting Privacy/Multi-Tenancy Verification...');

    const userA = `user_alice_${Date.now()}`;
    const userB = `user_bob_${Date.now()}`;

    // 1. Insert Secret for Alice
    console.log(`\n1. Indexing Memory for Alice (${userA})...`);
    await indexMemory({
        content: "My secret code is RED.",
        uid: userA,
        agentId: 'universe',
        source: 'privacy-test',
        type: 'memory'
    });

    // 2. Insert Secret for Bob
    console.log(`2. Indexing Memory for Bob (${userB})...`);
    await indexMemory({
        content: "My secret code is BLUE.",
        uid: userB,
        agentId: 'universe',
        source: 'privacy-test',
        type: 'memory'
    });

    // Allow qdrant indexing (usually instant, but safe wait)
    await new Promise(r => setTimeout(r, 2000));

    // 3. Search as Alice
    console.log(`\n3. Searching as Alice for "secret code"...`);
    const aliceResults = await searchMemories("secret code", userA, 'universe', 5);

    console.log('   Alice Results:', aliceResults.map(r => r.content));

    const aliceHasRed = aliceResults.some(r => r.content.includes("RED"));
    const aliceHasBlue = aliceResults.some(r => r.content.includes("BLUE"));

    if (aliceHasRed && !aliceHasBlue) {
        console.log('   ✅ Alice sees RED, does NOT see BLUE.');
    } else {
        console.error('   ❌ Alice Check Failed!');
        if (!aliceHasRed) console.error('      - Missing RED (Self)');
        if (aliceHasBlue) console.error('      - Leaked BLUE (Other User)');
        process.exit(1);
    }

    // 4. Search as Bob
    console.log(`\n4. Searching as Bob for "secret code"...`);
    const bobResults = await searchMemories("secret code", userB, 'universe', 5);

    console.log('   Bob Results:', bobResults.map(r => r.content));

    const bobHasBlue = bobResults.some(r => r.content.includes("BLUE"));
    const bobHasRed = bobResults.some(r => r.content.includes("RED"));

    if (bobHasBlue && !bobHasRed) {
        console.log('   ✅ Bob sees BLUE, does NOT see RED.');
    } else {
        console.error('   ❌ Bob Check Failed!');
        if (!bobHasBlue) console.error('      - Missing BLUE (Self)');
        if (bobHasRed) console.error('      - Leaked RED (Other User)');
        process.exit(1);
    }

    console.log('\n🌟 PRIVACY VERIFICATION PASSED: Strict Multi-Tenancy Confirmed.');
}

runPrivacyTest().catch(e => {
    console.error('Test Failed:', e);
    process.exit(1);
});
