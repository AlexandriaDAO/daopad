// Test script to verify the correct variant format for Orbit Station
import { IDL } from '@dfinity/candid';

// Define the RequestStatusCode variant as in orbitStation.js
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

// Test different encodings
console.log('Testing variant encodings:\n');

// Test 1: Direct variant
const variant1 = { Created: null };
console.log('Direct variant object:', variant1);

// Test 2: What we expect for statuses field (IDL.Opt(IDL.Vec(RequestStatusCode)))
const statuses1 = [{ Created: null }];
console.log('Array with one variant:', statuses1);

// Test 3: Double-wrapped for optional
const statuses2 = [[{ Created: null }]];
console.log('Double-wrapped array:', statuses2);

// Test 4: Using IDL encoder
try {
  const encoded = IDL.encode([IDL.Vec(RequestStatusCode)], [[{ Created: null }]]);
  console.log('IDL encoded Vec(RequestStatusCode):', encoded);
} catch (e) {
  console.log('Error encoding:', e.message);
}

// Test 5: Check what the actual IDL expects
const ListRequestsInput = IDL.Record({
  statuses: IDL.Opt(IDL.Vec(RequestStatusCode)),
});

const testInput1 = {
  statuses: [], // None
};

const testInput2 = {
  statuses: [{ Created: null }], // Some([variant])
};

const testInput3 = {
  statuses: [[{ Created: null }]], // Some([variant]) double-wrapped
};

console.log('\nTest inputs:');
console.log('Input 1 (None):', testInput1);
console.log('Input 2 (single wrap):', testInput2);
console.log('Input 3 (double wrap):', testInput3);

// Try encoding each
try {
  console.log('\nTrying to encode as IDL:');
  const encoded1 = IDL.encode([ListRequestsInput], [testInput1]);
  console.log('Encoded input 1 successfully');
  
  const encoded2 = IDL.encode([ListRequestsInput], [testInput2]);
  console.log('Encoded input 2 successfully');
  
  const encoded3 = IDL.encode([ListRequestsInput], [testInput3]);
  console.log('Encoded input 3 successfully');
} catch (e) {
  console.log('Encoding error:', e.message);
}