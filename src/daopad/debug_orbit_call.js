#!/usr/bin/env node

// Simple debug script to test Orbit Station list_requests call
import { HttpAgent, Actor } from '@dfinity/agent';
import { idlFactory } from './daopad_frontend/src/services/orbitStation.did.js';
import { Principal } from '@dfinity/principal';

async function testListRequests() {
  const stationId = Principal.fromText('fec7w-zyaaa-aaaaa-qaffq-cai');

  const agent = new HttpAgent({
    host: 'https://icp0.io'
  });

  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId: stationId
  });

  console.log('Testing different parameter combinations...\n');

  // Test 1: Minimal call - what Orbit actually sends
  try {
    console.log('Test 1: Orbit pattern - arrays wrapped in single brackets');
    const result1 = await actor.list_requests({
      statuses: [],
      created_from_dt: [],
      created_to_dt: [],
      expiration_from_dt: [],
      expiration_to_dt: [],
      operation_types: [],
      requester_ids: [],
      approver_ids: [],
      paginate: [],
      sort_by: [],
      only_approvable: false,
      with_evaluation_results: false,
      deduplication_keys: [],
      tags: []
    });
    console.log('✅ SUCCESS with empty arrays for all fields');
  } catch (e) {
    console.log('❌ FAILED:', e.message);
  }

  // Test 2: Without deduplication_keys and tags
  try {
    console.log('\nTest 2: Without deduplication_keys and tags');
    const result2 = await actor.list_requests({
      statuses: [],
      created_from_dt: [],
      created_to_dt: [],
      expiration_from_dt: [],
      expiration_to_dt: [],
      operation_types: [],
      requester_ids: [],
      approver_ids: [],
      paginate: [],
      sort_by: [],
      only_approvable: false,
      with_evaluation_results: false
    });
    console.log('✅ SUCCESS without deduplication_keys and tags');
  } catch (e) {
    console.log('❌ FAILED:', e.message);
  }

  // Test 3: With a status filter (wrapped array)
  try {
    console.log('\nTest 3: With status filter');
    const result3 = await actor.list_requests({
      statuses: [[ { Created: null } ]],  // Wrap the array!
      created_from_dt: [],
      created_to_dt: [],
      expiration_from_dt: [],
      expiration_to_dt: [],
      operation_types: [],
      requester_ids: [],
      approver_ids: [],
      paginate: [],
      sort_by: [],
      only_approvable: false,
      with_evaluation_results: false,
      deduplication_keys: [],
      tags: []
    });
    console.log('✅ SUCCESS with wrapped status array');
  } catch (e) {
    console.log('❌ FAILED:', e.message);
  }
}

testListRequests().catch(console.error);