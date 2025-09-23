#!/usr/bin/env node

import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import fetch from 'isomorphic-fetch';

global.fetch = fetch;

// Backend canister ID
const BACKEND_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';

// Import the IDL factory
const idlFactory = ({ IDL }) => {
  // Define PaginationInput
  const PaginationInput = IDL.Record({
    'offset': IDL.Opt(IDL.Nat64),
    'limit': IDL.Opt(IDL.Nat64),
  });

  // Define ListAddressBookEntriesInput
  const ListAddressBookEntriesInput = IDL.Record({
    'ids': IDL.Opt(IDL.Vec(IDL.Text)),
    'addresses': IDL.Opt(IDL.Vec(IDL.Text)),
    'blockchain': IDL.Opt(IDL.Text),
    'labels': IDL.Opt(IDL.Vec(IDL.Text)),
    'paginate': IDL.Opt(PaginationInput),
    'address_formats': IDL.Opt(IDL.Vec(IDL.Text)),
    'search_term': IDL.Opt(IDL.Text),
  });

  // Define minimal response types
  const AddressBookEntry = IDL.Record({
    'id': IDL.Text,
    'address_owner': IDL.Text,
    'address': IDL.Text,
    'blockchain': IDL.Text,
    'labels': IDL.Vec(IDL.Text),
  });

  const ListAddressBookEntriesResponse = IDL.Record({
    'total': IDL.Nat64,
    'privileges': IDL.Vec(IDL.Record({})),
    'address_book_entries': IDL.Vec(AddressBookEntry),
    'next_offset': IDL.Opt(IDL.Nat64),
  });

  const ListAddressBookEntriesResult = IDL.Variant({
    'Ok': ListAddressBookEntriesResponse,
    'Err': IDL.Record({ 'message': IDL.Text }),
  });

  return IDL.Service({
    'list_address_book_entries': IDL.Func([ListAddressBookEntriesInput], [ListAddressBookEntriesResult], ['query']),
  });
};

async function testEncoding() {
  try {
    console.log('Testing JavaScript encoding for address book pagination...\n');

    // Create agent
    const agent = new HttpAgent({ host: 'https://ic0.app' });

    // Create actor
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: BACKEND_ID,
    });

    // Test case 1: With nested optional wrapping (correct)
    console.log('Test 1: Nested optional wrapping (as per Orbit frontend pattern)');
    const input1 = {
      ids: [],
      addresses: [],
      blockchain: [],
      labels: [],
      paginate: [{
        offset: [0],     // opt nat64 wrapped
        limit: [100]     // opt nat64 wrapped
      }],
      address_formats: [],
      search_term: []
    };
    console.log('Input:', JSON.stringify(input1, null, 2));

    try {
      const result1 = await actor.list_address_book_entries(input1);
      console.log('✅ Success!', result1);
    } catch (e) {
      console.log('❌ Failed:', e.message);
    }

    console.log('\n---\n');

    // Test case 2: Without nested wrapping (incorrect)
    console.log('Test 2: Without nested wrapping (what was causing the error)');
    const input2 = {
      ids: [],
      addresses: [],
      blockchain: [],
      labels: [],
      paginate: [{
        offset: 0,      // plain number (incorrect)
        limit: 100      // plain number (incorrect)
      }],
      address_formats: [],
      search_term: []
    };
    console.log('Input:', JSON.stringify(input2, null, 2));

    try {
      const result2 = await actor.list_address_book_entries(input2);
      console.log('✅ Success!', result2);
    } catch (e) {
      console.log('❌ Failed:', e.message);
    }

  } catch (error) {
    console.error('Test failed:', error);
  }
}

testEncoding();