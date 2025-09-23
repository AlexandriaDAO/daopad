#!/usr/bin/env node

// Test the fixed encoding for address book pagination

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// Test station
const STATION_ID = 'fec7w-zyaaa-aaaaa-qaffq-cai';

// Create the proper Candid input with nested optional encoding
const testInput = {
  ids: [],
  addresses: [],
  blockchain: [],
  labels: [],
  paginate: [{
    offset: [0],    // opt nat64 - array wrapped
    limit: [100]    // opt nat64 - array wrapped
  }],
  address_formats: [],
  search_term: []
};

console.log('Testing address book with correct pagination encoding:');
console.log(JSON.stringify(testInput, null, 2));

console.log('\n✅ This matches the pattern from orbit-reference/apps/wallet/src/services/station.service.ts');
console.log('Each optional field needs its own array wrapping:');
console.log('- paginate: opt PaginationInput -> [{}]');
console.log('- offset: opt nat64 -> [0] or []');
console.log('- limit: opt nat64 -> [100] or []');