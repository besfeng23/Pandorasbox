/**
 * Test Base44 Existing Entities
 * 
 * Tests the Base44 API with existing entities (Event and KairosBug)
 * to verify the connection works before running sync.
 */

import { initBase44Client } from '../src/lib/base44Client';

async function testExistingEntities() {
  console.log('🧪 Testing Base44 API with Existing Entities\n');

  // Initialize client
  await initBase44Client();

  const appId = process.env.BASE44_APP_ID;
  const apiKey = process.env.BASE44_API_KEY;
  const baseUrl = process.env.BASE44_API_URL || 'https://kairostrack.base44.app';

  if (!appId || !apiKey) {
    console.error('❌ BASE44_APP_ID and BASE44_API_KEY are required');
    process.exit(1);
  }

  console.log(`App ID: ${appId}`);
  console.log(`Base URL: ${baseUrl}\n`);

  // Test Event entity
  console.log('📊 Testing Event Entity...');
  try {
    const eventUrl = `${baseUrl}/api/apps/${appId}/entities/Event`;
    const eventResponse = await fetch(eventUrl, {
      headers: {
        'api_key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (eventResponse.ok) {
      const eventData = await eventResponse.json();
      const events = Array.isArray(eventData) ? eventData : (eventData.items || []);
      console.log(`✅ Event: ${events.length} items found`);
      
      if (events.length > 0) {
        const sample = events[0];
        console.log(`   Sample event keys: ${Object.keys(sample).join(', ')}`);
        if (sample.event_type) {
          console.log(`   Sample event_type: ${sample.event_type}`);
        }
      }
    } else {
      const error = await eventResponse.text();
      console.log(`❌ Event: ${eventResponse.status} - ${error.substring(0, 100)}`);
    }
  } catch (error: any) {
    console.log(`❌ Event: ERROR - ${error.message}`);
  }

  // Test KairosBug entity
  console.log('\n🐛 Testing KairosBug Entity...');
  try {
    const bugUrl = `${baseUrl}/api/apps/${appId}/entities/KairosBug`;
    const bugResponse = await fetch(bugUrl, {
      headers: {
        'api_key': apiKey,
        'Content-Type': 'application/json',
      },
    });

    if (bugResponse.ok) {
      const bugData = await bugResponse.json();
      const bugs = Array.isArray(bugData) ? bugData : (bugData.items || []);
      console.log(`✅ KairosBug: ${bugs.length} items found`);
      
      if (bugs.length > 0) {
        const sample = bugs[0];
        console.log(`   Sample bug keys: ${Object.keys(sample).join(', ')}`);
      }
    } else {
      const error = await bugResponse.text();
      console.log(`❌ KairosBug: ${bugResponse.status} - ${error.substring(0, 100)}`);
    }
  } catch (error: any) {
    console.log(`❌ KairosBug: ERROR - ${error.message}`);
  }

  // Test missing entities (should gracefully fail)
  console.log('\n🔍 Testing Missing Entities (should fail gracefully)...');
  const missingEntities = ['Phase', 'SystemStatus', 'AlignmentChecklist'];
  
  for (const entityName of missingEntities) {
    try {
      const url = `${baseUrl}/api/apps/${appId}/entities/${entityName}`;
      const response = await fetch(url, {
        headers: {
          'api_key': apiKey,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const count = Array.isArray(data) ? data.length : (data.items ? data.items.length : 'N/A');
        console.log(`✅ ${entityName}: EXISTS (${count} items)`);
      } else if (response.status === 404) {
        console.log(`⚠️  ${entityName}: NOT FOUND (expected - entity not created yet)`);
      } else {
        const error = await response.text();
        console.log(`⚠️  ${entityName}: ${response.status} - ${error.substring(0, 100)}`);
      }
    } catch (error: any) {
      console.log(`⚠️  ${entityName}: ERROR - ${error.message}`);
    }
  }

  console.log('\n✅ Entity testing complete!');
  console.log('\n💡 Next steps:');
  console.log('   1. Create missing entities (Phase, SystemStatus, AlignmentChecklist) in Base44');
  console.log('   2. Run sync: npm run base44:sync:verbose');
}

testExistingEntities().catch(console.error);

