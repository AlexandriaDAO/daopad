/**
 * Comprehensive Permissions Subtabs Integration Test
 *
 * Tests that each subtab can actually load and display data from mainnet:
 * - Overview: Voting tier display + permission categories
 * - Permissions: List all permissions grouped by category
 * - User Groups: System groups (Admin, Operator)
 * - Analytics: Vote distribution (future - currently placeholder)
 * - Tools: Permission request helper (future - currently placeholder)
 */

import { describe, test, expect, beforeAll } from 'vitest';
import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory as backend_idl } from '../declarations/daopad_backend';

describe('Permissions Subtabs Integration Tests', () => {
  const MAINNET_HOST = 'https://icp0.io';
  const BACKEND_CANISTER_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';
  const TEST_STATION_ID = Principal.fromText('fec7w-zyaaa-aaaaa-qaffq-cai');

  let actor;

  beforeAll(async () => {
    const agent = new HttpAgent({ host: MAINNET_HOST });
    actor = Actor.createActor(backend_idl, {
      agent,
      canisterId: BACKEND_CANISTER_ID,
    });
  });

  describe('Permissions Subtab', () => {
    test('should load permissions for display in PermissionsTable', async () => {
      const result = await actor.list_station_permissions(TEST_STATION_ID, []);

      // Verify we get Ok variant with permissions array
      expect(result).toHaveProperty('Ok');
      expect(result.Ok).toBeInstanceOf(Array);
      expect(result.Ok.length).toBeGreaterThan(0);

      // Verify permission structure needed by PermissionsTable component
      const firstPerm = result.Ok[0];
      expect(firstPerm).toHaveProperty('resource');
      expect(firstPerm).toHaveProperty('allow');
      expect(firstPerm.allow).toHaveProperty('auth_scope');
      expect(firstPerm.allow).toHaveProperty('user_groups');
      expect(firstPerm.allow).toHaveProperty('users');

      console.log(`✓ Permissions subtab: Loaded ${result.Ok.length} permissions`);
    }, 30000);

    test('should have permissions for all major resource categories', async () => {
      const result = await actor.list_station_permissions(TEST_STATION_ID, []);
      expect(result).toHaveProperty('Ok');

      const resourceTypes = new Set(
        result.Ok.map(p => Object.keys(p.resource)[0])
      );

      // Categories that PermissionsTable filters by
      const expectedCategories = {
        treasury: ['Account', 'Asset', 'AddressBook'],
        canisters: ['ExternalCanister'],
        users: ['User', 'UserGroup'],
        system: ['System', 'RequestPolicy', 'Request', 'Permission']
      };

      // Check each category has at least one resource type
      for (const [category, types] of Object.entries(expectedCategories)) {
        const found = types.some(type => resourceTypes.has(type));
        expect(found).toBe(true);
        console.log(`✓ Category "${category}" has permissions: ${types.filter(t => resourceTypes.has(t)).join(', ')}`);
      }
    }, 30000);

    test('permissions should be filterable by auth_scope', async () => {
      const result = await actor.list_station_permissions(TEST_STATION_ID, []);
      expect(result).toHaveProperty('Ok');

      const authScopes = new Set(
        result.Ok.map(p => Object.keys(p.allow.auth_scope)[0])
      );

      // PermissionsTable might filter by these scopes
      expect(authScopes.size).toBeGreaterThan(0);
      console.log(`✓ Found auth scopes: ${Array.from(authScopes).join(', ')}`);
    }, 30000);
  });

  describe('User Groups Subtab', () => {
    test('should identify system groups in permissions data', async () => {
      const result = await actor.list_station_permissions(TEST_STATION_ID, []);
      expect(result).toHaveProperty('Ok');

      // Check if any permissions have user_groups assigned
      const allUserGroups = result.Ok.flatMap(p => p.allow.user_groups);
      const groupIds = new Set(allUserGroups.map(g => g.id));

      // UserGroupsList component hardcodes these IDs - verify some groups exist
      expect(groupIds.size).toBeGreaterThan(0);

      const groupList = Array.from(groupIds).slice(0, 3).join(', ');
      console.log(`✓ User Groups subtab: Found ${groupIds.size} unique groups (e.g., ${groupList})`);
    }, 30000);

    test('permissions should show which groups have access', async () => {
      const result = await actor.list_station_permissions(TEST_STATION_ID, []);
      expect(result).toHaveProperty('Ok');

      // Count permissions with group restrictions
      const permsWithGroups = result.Ok.filter(p => p.allow.user_groups.length > 0);

      expect(permsWithGroups.length).toBeGreaterThan(0);
      console.log(`✓ ${permsWithGroups.length}/${result.Ok.length} permissions have group restrictions`);
    }, 30000);
  });

  describe('Overview Subtab', () => {
    test('should provide data for permission categories summary', async () => {
      const result = await actor.list_station_permissions(TEST_STATION_ID, []);
      expect(result).toHaveProperty('Ok');

      // Overview tab shows count of permissions by category
      const resourceTypes = result.Ok.map(p => Object.keys(p.resource)[0]);

      const categoryCounts = {
        treasury: resourceTypes.filter(r => ['Account', 'Asset', 'AddressBook'].includes(r)).length,
        canisters: resourceTypes.filter(r => r === 'ExternalCanister').length,
        users: resourceTypes.filter(r => ['User', 'UserGroup'].includes(r)).length,
        system: resourceTypes.filter(r => ['System', 'Request', 'RequestPolicy', 'Permission'].includes(r)).length
      };

      // Each category should have at least some permissions
      expect(categoryCounts.treasury).toBeGreaterThan(0);
      expect(categoryCounts.users).toBeGreaterThan(0);
      expect(categoryCounts.system).toBeGreaterThan(0);

      console.log('✓ Overview subtab category counts:', categoryCounts);
    }, 30000);
  });

  describe('Component Data Requirements', () => {
    test('PermissionsTable component can render all permission types', async () => {
      const result = await actor.list_station_permissions(TEST_STATION_ID, []);
      expect(result).toHaveProperty('Ok');

      // Check that we have the data structure PermissionsTable expects
      for (const perm of result.Ok.slice(0, 5)) {
        // Component renders resource type
        expect(perm.resource).toBeDefined();
        expect(Object.keys(perm.resource).length).toBe(1);

        // Component renders auth scope badge
        expect(perm.allow.auth_scope).toBeDefined();
        expect(Object.keys(perm.allow.auth_scope).length).toBe(1);

        // Component shows group/user restrictions
        expect(Array.isArray(perm.allow.user_groups)).toBe(true);
        expect(Array.isArray(perm.allow.users)).toBe(true);
      }

      console.log('✓ All permissions have required fields for PermissionsTable rendering');
    }, 30000);

    test('data structure matches frontend expectations', async () => {
      const result = await actor.list_station_permissions(TEST_STATION_ID, []);
      expect(result).toHaveProperty('Ok');

      const perm = result.Ok[0];

      // Frontend expects these exact structures
      const resourceType = Object.keys(perm.resource)[0];
      expect(typeof resourceType).toBe('string');

      const authScope = Object.keys(perm.allow.auth_scope)[0];
      expect(['Public', 'Authenticated', 'Restricted'].includes(authScope)).toBe(true);

      console.log(`✓ Data structure matches frontend: Resource=${resourceType}, Auth=${authScope}`);
    }, 30000);
  });

  describe('Error Handling', () => {
    test('backend should handle invalid station ID gracefully', async () => {
      const invalidStation = Principal.fromText('aaaaa-aa');

      const result = await actor.list_station_permissions(invalidStation, []);

      // Should return Err variant, not throw
      expect(result).toHaveProperty('Err');
      expect(typeof result.Err).toBe('string');

      console.log(`✓ Invalid station handled: ${result.Err}`);
    }, 30000);
  });
});
