import { IDL } from '@dfinity/candid';

// Try defining the variant without IDL.Null (as bare tags)
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

console.log('Testing with bare variant tags (no IDL.Null):');

const ListRequestsInput = IDL.Record({
  statuses: IDL.Opt(IDL.Vec(RequestStatusCode)),
});

// Test different formats
const tests = [
  { name: 'Empty (None)', value: { statuses: [] }},
  { name: 'Simple string', value: { statuses: ['Created'] }},
  { name: 'Object with null', value: { statuses: [{ Created: null }] }},
  { name: 'Object with undefined', value: { statuses: [{ Created: undefined }] }},
  { name: 'Object without value', value: { statuses: [{ Created }] }},
];

for (const test of tests) {
  try {
    IDL.encode([ListRequestsInput], [test.value]);
    console.log(`✓ ${test.name} works`);
  } catch(e) {
    console.log(`✗ ${test.name} failed:`, e.message.split('\n')[0]);
  }
}

// The correct way according to @dfinity/candid docs
console.log('\nChecking variant construction:');
const createdVariant = { 'Created': null };
console.log('Variant value:', createdVariant);
console.log('Type:', typeof createdVariant);
console.log('Keys:', Object.keys(createdVariant));
