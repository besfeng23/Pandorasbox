/**
 * Test Base44 API Integration
 * 
 * Tests the Base44 kairosApi function endpoints to verify they're working correctly.
 * 
 * Usage:
 *   npm run base44:test
 * 
 * Environment Variables:
 *   BASE44_API_URL (default: https://kairostrack.base44.app)
 *   BASE44_API_KEY (required)
 */

import {
  initBase44Client,
  fetchActivePhase,
  fetchPhaseSystemStatus,
  fetchActiveBugs,
  fetchAlignmentChecklist,
} from '../src/lib/base44Client';

async function testBase44API() {
  console.log('🧪 Testing Base44 API Integration\n');

  // Initialize client
  initBase44Client();
  
  if (!process.env.BASE44_API_KEY) {
    console.error('❌ BASE44_API_KEY environment variable is required');
    console.log('\nSet it with:');
    console.log('  export BASE44_API_KEY=your_key_here');
    console.log('  # or on Windows:');
    console.log('  $env:BASE44_API_KEY="your_key_here"');
    process.exit(1);
  }

  const tests = [
    {
      name: 'Fetch Active Phase',
      test: async () => {
        const phase = await fetchActivePhase();
        console.log('✅ Active Phase:', {
          phaseId: phase.phaseId,
          status: phase.status,
          hasObjective: !!phase.objective,
        });
        return phase;
      },
    },
    {
      name: 'Fetch System Status',
      test: async () => {
        // First get active phase to get phaseId
        const phase = await fetchActivePhase();
        const status = await fetchPhaseSystemStatus(phase.phaseId);
        console.log('✅ System Status:', status);
        return status;
      },
    },
    {
      name: 'Fetch Active Bugs',
      test: async () => {
        const bugs = await fetchActiveBugs();
        console.log(`✅ Active Bugs: ${bugs.length} bugs found`);
        if (bugs.length > 0) {
          console.log('   Sample bug:', {
            bugId: bugs[0].bugId,
            severity: bugs[0].severity,
            affectedSystems: bugs[0].affectedSystems,
          });
        }
        return bugs;
      },
    },
    {
      name: 'Fetch Alignment Checklist',
      test: async () => {
        const checklist = await fetchAlignmentChecklist();
        console.log('✅ Alignment Checklist:', checklist);
        return checklist;
      },
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const { name, test } of tests) {
    try {
      console.log(`\n📋 Testing: ${name}`);
      await test();
      passed++;
    } catch (error: any) {
      console.error(`❌ Failed: ${name}`);
      console.error(`   Error: ${error.message}`);
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        console.error('\n💡 Tip: Check that your BASE44_API_KEY is correct');
      }
      if (error.message.includes('404')) {
        console.error('\n💡 Tip: The endpoint may not be implemented yet in Base44');
      }
      failed++;
    }
  }

  console.log(`\n\n📊 Test Results:`);
  console.log(`   ✅ Passed: ${passed}`);
  console.log(`   ❌ Failed: ${failed}`);
  console.log(`   Total: ${passed + failed}`);

  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All tests passed!');
    process.exit(0);
  }
}

testBase44API().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

