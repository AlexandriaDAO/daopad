import { IDL } from '@dfinity/candid';

// WAIT - I think the issue is we're passing `null` instead of `IDL.Null`!
const RequestStatusCode = IDL.Variant({
  'Created': IDL.Null,    // This should be IDL.Null, not null!
  'Approved': IDL.Null,
  'Rejected': IDL.Null,
  'Cancelled': IDL.Null,
  'Scheduled': IDL.Null,
  'Processing': IDL.Null,
  'Completed': IDL.Null,
  'Failed': IDL.Null,
});

console.log('Testing with correct IDL.Null:\n');

const ListRequestsInput = IDL.Record({
  statuses: IDL.Opt(IDL.Vec(RequestStatusCode)),
});

// Test different formats
const tests = [
  { name: 'Empty (None)', value: { statuses: [] }},
  { name: 'Array with object', value: { statuses: [{ Created: null }] }},
];

for (const test of tests) {
  console.log(`Testing: ${test.name}`);
  console.log('Value:', JSON.stringify(test.value));
  
  try {
    const encoded = IDL.encode([ListRequestsInput], [test.value]);
    console.log(`✓ Success - encoded to ${encoded.length} bytes\n`);
  } catch(e) {
    const errorMsg = e.message.split('\n')[0];
    console.log(`✗ Failed:`, errorMsg, '\n');
  }
}
