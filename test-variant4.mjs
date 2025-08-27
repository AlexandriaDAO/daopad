import { IDL } from '@dfinity/candid';

// Define exactly as shown in Orbit's spec.did
const RequestStatusCode = IDL.Variant({
  'Created': null,
  'Approved': null,  
  'Rejected': null,
  'Cancelled': null,
  'Scheduled': null,
  'Processing': null,
  'Completed': null,
  'Failed': null,
});

console.log('Testing variant encoding formats:\n');

const ListRequestsInput = IDL.Record({
  statuses: IDL.Opt(IDL.Vec(RequestStatusCode)),
});

// Test different formats
const tests = [
  { name: 'Empty (None)', value: { statuses: [] }},
  { name: 'Simple string array', value: { statuses: ['Created'] }},
  { name: 'Object with null', value: { statuses: [{ Created: null }] }},
];

for (const test of tests) {
  console.log(`Testing: ${test.name}`);
  console.log('Value:', JSON.stringify(test.value));
  
  try {
    const encoded = IDL.encode([ListRequestsInput], [test.value]);
    console.log(`✓ Success - encoded to ${encoded.length} bytes\n`);
  } catch(e) {
    console.log(`✗ Failed:`, e.message.split('\n')[0], '\n');
  }
}

// Check how the candid library expects variants to be passed
console.log('According to @dfinity/candid docs, variants should be objects with a single key.');
console.log('E.g., { Created: null } for a variant with no associated data\n');

// But the error suggests it\'s not accepting that format...
// Let me check if maybe we need to use symbols or something else
console.log('Checking Symbol usage:');
const CreatedSymbol = Symbol.for('Created');
const test4 = { statuses: [{ [CreatedSymbol]: null }] };
console.log('Symbol variant:', test4);

try {
  IDL.encode([ListRequestsInput], [test4]);
  console.log('✓ Symbol variant works');
} catch(e) {
  console.log('✗ Symbol variant failed');
}
