// Test with actual Orbit variant construction
import { IDL } from '@dfinity/candid';

const RequestStatusCode = IDL.Variant({
  Created: IDL.Null,
  Approved: IDL.Null,
  Rejected: IDL.Null,
  Cancelled: IDL.Null,
  Scheduled: IDL.Null,
  Processing: IDL.Null,
  Completed: IDL.Null,
  Failed: IDL.Null,
});

// The proper way to construct a variant value for IDL
const createdVariant = { 'Created': null };

console.log('Testing proper variant format:');
console.log('Variant object:', createdVariant);

// For an optional vector of variants
const ListRequestsInput = IDL.Record({
  statuses: IDL.Opt(IDL.Vec(RequestStatusCode)),
});

// Test 1: Empty array = None
const test1 = { statuses: [] };

// Test 2: Array with variant = Some([variant])  
const test2 = { statuses: [createdVariant] };

console.log('\nTest encoding with proper format:');
try {
  IDL.encode([ListRequestsInput], [test1]);
  console.log('✓ Empty array (None) works');
} catch(e) {
  console.log('✗ Empty array failed:', e.message);
}

try {
  IDL.encode([ListRequestsInput], [test2]);
  console.log('✓ Array with variant works');
} catch(e) {
  console.log('✗ Array with variant failed:', e.message);
}

// Test if the issue is with dynamic property names
const dynamicStatus = 'Created';
const dynamicVariant = {};
dynamicVariant[dynamicStatus] = null;

const test3 = { statuses: [dynamicVariant] };

console.log('\nTesting with dynamic property:');
console.log('Dynamic variant:', dynamicVariant);

try {
  IDL.encode([ListRequestsInput], [test3]);
  console.log('✓ Dynamic property variant works');
} catch(e) {
  console.log('✗ Dynamic property variant failed:', e.message);
}

// Check if the variants are equal
console.log('\nAre variants equal?');
console.log('Static == Dynamic:', JSON.stringify(createdVariant) === JSON.stringify(dynamicVariant));
