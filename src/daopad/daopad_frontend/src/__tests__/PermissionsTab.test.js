/**
 * Integration test for Permissions Tab
 * Tests backend list_station_permissions method on actual mainnet canister
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory as backend_idl } from '../declarations/daopad_backend';

describe('Permissions Tab Integration Test', () => {
  const MAINNET_HOST = 'https://icp0.io';
  const BACKEND_CANISTER_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';
  const TEST_STATION_ID = Principal.fromText('fec7w-zyaaa-aaaaa-qaffq-cai');

  let actor;

  beforeAll(async () => {
    // Create actor for mainnet backend
    const agent = new HttpAgent({ host: MAINNET_HOST });

    // Note: In production, we'd need to use fetchRootKey only for local testing
    // For mainnet, this is not needed

    actor = Actor.createActor(backend_idl, {
      agent,
      canisterId: BACKEND_CANISTER_ID,
    });
  });

  test('list_station_permissions should return Ok variant without decode error', async () => {
    // Call actual backend on mainnet
    const result = await actor.list_station_permissions(TEST_STATION_ID, []);

    // Should return Ok variant, not Err
    expect(result).toHaveProperty('Ok');
    expect(result.Ok).toBeInstanceOf(Array);
    expect(result.Ok.length).toBeGreaterThan(0);

    console.log(`✓ Received ${result.Ok.length} permissions from mainnet backend`);
  }, 30000); // 30s timeout for mainnet call

  test('permissions should have proper structure with resource and allow fields', async () => {
    const result = await actor.list_station_permissions(TEST_STATION_ID, []);

    expect(result).toHaveProperty('Ok');

    // Verify permission structure
    const firstPerm = result.Ok[0];
    expect(firstPerm).toHaveProperty('resource');
    expect(firstPerm).toHaveProperty('allow');

    // Verify allow structure
    expect(firstPerm.allow).toHaveProperty('auth_scope');
    expect(firstPerm.allow).toHaveProperty('user_groups');
    expect(firstPerm.allow).toHaveProperty('users');

    console.log(`✓ Permission structure verified: ${Object.keys(firstPerm.resource)[0]}`);
  }, 30000);

  test('backend should handle null resources parameter correctly', async () => {
    // Test with empty array (all resources)
    const resultAll = await actor.list_station_permissions(TEST_STATION_ID, []);

    expect(resultAll).toHaveProperty('Ok');
    expect(resultAll.Ok).toBeInstanceOf(Array);

    // Verify we get multiple permission types
    const resourceTypes = new Set(
      resultAll.Ok.map(p => Object.keys(p.resource)[0])
    );

    expect(resourceTypes.size).toBeGreaterThan(1);

    console.log(`✓ Retrieved ${resourceTypes.size} different resource types`);
  }, 30000);

  test('permissions should include expected resource types', async () => {
    const result = await actor.list_station_permissions(TEST_STATION_ID, []);

    expect(result).toHaveProperty('Ok');

    // Collect all resource type names
    const resourceTypes = result.Ok.map(p => Object.keys(p.resource)[0]);

    // Should include common resource types
    const commonTypes = ['Account', 'User', 'Request', 'Permission', 'System'];
    const foundTypes = commonTypes.filter(type => resourceTypes.includes(type));

    expect(foundTypes.length).toBeGreaterThan(0);

    console.log(`✓ Found expected resource types: ${foundTypes.join(', ')}`);
  }, 30000);
});
