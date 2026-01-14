/**
 * Test Base44 Entities - Check what entities exist
 */

import { initBase44Client } from '../src/lib/base44Client';

async function testEntities() {
  await initBase44Client();
  
  const appId = process.env.BASE44_APP_ID;
  const apiKey = process.env.BASE44_API_KEY;
  const baseUrl = process.env.BASE44_API_URL || 'https://app.base44.com';

  console.log('🔍 Testing Base44 Entities\n');
  console.log(`App ID: ${appId}`);
  console.log(`Base URL: ${baseUrl}\n`);

  // Test known entities
  const entitiesToTest = [
    'Event',
    'KairosBug',
    'Phase',
    'SystemStatus',
    'AlignmentChecklist',
  ];

  for (const entityName of entitiesToTest) {
    try {
      const url = `${baseUrl}/api/apps/${appId}/entities/${entityName}`;
      const response = await fetch(url, {
        headers: {
          'api_key': apiKey!,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        const count = Array.isArray(data) ? data.length : (data.items ? data.items.length : 'N/A');
        console.log(`✅ ${entityName}: EXISTS (${count} items)`);
      } else if (response.status === 404) {
        console.log(`❌ ${entityName}: NOT FOUND`);
      } else {
        const error = await response.text();
        console.log(`⚠️  ${entityName}: ${response.status} - ${error.substring(0, 100)}`);
      }
    } catch (error: any) {
      console.log(`❌ ${entityName}: ERROR - ${error.message}`);
    }
  }

  console.log('\n✅ Entity check complete!');
}

testEntities().catch(console.error);

