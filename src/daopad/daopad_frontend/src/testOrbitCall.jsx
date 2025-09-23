// Test component to debug Orbit Station calls
import { HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory } from './services/orbitStation.did.js';

export async function testOrbitDirectCall() {
  const stationId = Principal.fromText('fec7w-zyaaa-aaaaa-qaffq-cai');

  const agent = new HttpAgent({
    host: 'https://icp0.io'
  });

  const actor = Actor.createActor(idlFactory, {
    agent,
    canisterId: stationId
  });

  console.log('=== Testing Orbit Station Direct Call ===');

  // Test what we know works from dfx
  const testCases = [
    {
      name: 'Empty arrays (like Orbit code)',
      params: {
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
      }
    },
    {
      name: 'Without tags/dedup',
      params: {
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
      }
    },
    {
      name: 'With status filter (wrapped)',
      params: {
        statuses: [[{ Created: null }]],
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
      }
    }
  ];

  for (const test of testCases) {
    console.log(`\nTest: ${test.name}`);
    try {
      const result = await actor.list_requests(test.params);
      console.log(`✅ SUCCESS - Got ${result.Ok?.total || 0} results`);
    } catch (error) {
      console.log(`❌ FAILED - ${error.message}`);
    }
  }
}