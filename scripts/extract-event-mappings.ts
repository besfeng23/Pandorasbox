/**
 * Extract eventMappings from masterplan JSON
 * 
 * This script extracts the eventMappings from the masterplan JSON
 * and outputs them in a format that can be used for validation.
 */

import { SAMPLE_MASTERPLAN } from './kairos/masterplan.sample';

// Extract and print eventMappings
const masterplan = SAMPLE_MASTERPLAN;
const allEventMappings: Array<{
  type: string;
  payloadMatch: string[];
  updates?: Record<string, any>;
  nodeId: string;
}> = [];

masterplan.masterPlan.nodes.forEach((node: any) => {
  const mappings = node.eventMappings || node.event_mappings || [];
  mappings.forEach((mapping: any) => {
    allEventMappings.push({
      ...mapping,
      nodeId: node.nodeId,
    });
  });
});

// Group by type
const byType: Record<string, Array<{ payloadMatch: string[]; nodeId: string }>> = {};
allEventMappings.forEach(m => {
  if (!byType[m.type]) {
    byType[m.type] = [];
  }
  byType[m.type].push({
    payloadMatch: m.payloadMatch,
    nodeId: m.nodeId,
  });
});

console.log('📊 Event Mappings Summary:');
console.log(`Total unique event types: ${Object.keys(byType).length}`);
console.log(`Total mappings: ${allEventMappings.length}`);
console.log('');

console.log('📋 Event Types with Required Fields:');
Object.entries(byType).forEach(([type, mappings]) => {
  // Get union of all required fields for this type
  const allFields = new Set<string>();
  mappings.forEach(m => m.payloadMatch.forEach(f => allFields.add(f)));
  
  console.log(`\n${type}:`);
  console.log(`  Required fields: [${Array.from(allFields).join(', ')}]`);
  console.log(`  Used in nodes: ${mappings.map(m => m.nodeId).join(', ')}`);
});

console.log('\n✅ Extraction complete');

