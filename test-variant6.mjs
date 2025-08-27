import { IDL } from '@dfinity/candid';

const RequestStatusCode = IDL.Variant({
  'Created': IDL.Null,
  'Approved': IDL.Null,
  'Rejected': IDL.Null,
  'Cancelled': IDL.Null,
  'Scheduled': IDL.Null,
  'Processing': IDL.Null,
  'Completed': IDL.Null,
  'Failed': IDL.Null,
});

console.log('Debugging the variant issue:\n');

// Let's check what IDL.Vec expects
const vecOfVariants = IDL.Vec(RequestStatusCode);

console.log('Step 1: Encoding just the vector (not optional):');
try {
  const encoded = IDL.encode([vecOfVariants], [[{ Created: null }]]);
  console.log('✓ Vec encoding works! Encoded bytes:', encoded.length);
} catch(e) {
  console.log('✗ Vec encoding failed:', e.message.split('\n')[0]);
}

console.log('\nStep 2: Encoding with Opt wrapper:');
const optVecOfVariants = IDL.Opt(vecOfVariants);
try {
  // For optional: [] = None, [value] = Some(value)
  const encoded = IDL.encode([optVecOfVariants], [[[{ Created: null }]]]);
  console.log('✓ Opt(Vec) encoding works! Encoded bytes:', encoded.length);
} catch(e) {
  console.log('✗ Opt(Vec) encoding failed:', e.message.split('\n')[0]);
}

console.log('\nStep 3: As part of a record:');
const ListRequestsInput = IDL.Record({
  statuses: IDL.Opt(IDL.Vec(RequestStatusCode)),
});

// Try different patterns
const patterns = [
  { desc: 'None (empty array)', val: { statuses: [] } },
  { desc: 'Some with single variant', val: { statuses: [[{ Created: null }]] } },
];

for (const p of patterns) {
  try {
    const encoded = IDL.encode([ListRequestsInput], [p.val]);
    console.log(`✓ ${p.desc} works! Value:`, JSON.stringify(p.val));
  } catch(e) {
    console.log(`✗ ${p.desc} failed:`, e.message.split('\n')[0]);
  }
}
