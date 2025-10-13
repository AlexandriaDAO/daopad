import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AnonymousIdentity } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { CanisterService } from '../CanisterService';

/**
 * Integration test for CanisterService
 * Tests real actor creation with anonymous identity
 */
describe('CanisterService Integration', () => {
  let service: CanisterService;
  let identity: AnonymousIdentity;

  beforeEach(async () => {
    identity = new AnonymousIdentity();
    service = new CanisterService(() => identity);
    await service.initialize();
  });

  afterEach(async () => {
    await service.dispose();
  });

  describe('Actor Creation', () => {
    it('should create actor for a canister', async () => {
      // Use a simple IDL factory
      const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
        return IDL.Service({
          get: IDL.Func([], [IDL.Nat], ['query']),
        });
      };

      // Use ICP ledger canister ID (well-known canister)
      const ledgerCanisterId = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

      const actor = await service.createActor(ledgerCanisterId, idlFactory);

      expect(actor).toBeDefined();
      expect(typeof actor).toBe('object');
    });

    it('should cache actors by canister ID', async () => {
      const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
        return IDL.Service({
          get: IDL.Func([], [IDL.Nat], ['query']),
        });
      };

      const canisterId = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

      const actor1 = await service.createActor(canisterId, idlFactory);
      const actor2 = await service.createActor(canisterId, idlFactory);

      // Should return same instance from cache
      expect(actor1).toBe(actor2);
    });

    it('should clear cache when requested', async () => {
      const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
        return IDL.Service({
          get: IDL.Func([], [IDL.Nat], ['query']),
        });
      };

      const canisterId = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

      const actor1 = await service.createActor(canisterId, idlFactory);

      service.clearActorCache();

      const actor2 = await service.createActor(canisterId, idlFactory);

      // Should be different instances after cache clear
      expect(actor1).not.toBe(actor2);
    });
  });

  describe('Identity Management', () => {
    it('should update identity and clear cache', async () => {
      const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
        return IDL.Service({
          get: IDL.Func([], [IDL.Nat], ['query']),
        });
      };

      const canisterId = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

      // Create actor with first identity
      const actor1 = await service.createActor(canisterId, idlFactory);

      // Update to new identity
      const newIdentity = new AnonymousIdentity();
      await service.updateIdentity(newIdentity);

      // Create actor again - should be new instance due to cache clear
      const actor2 = await service.createActor(canisterId, idlFactory);

      expect(actor1).not.toBe(actor2);
    });
  });

  describe('Lifecycle', () => {
    it('should throw when used before initialization', async () => {
      const uninitializedService = new CanisterService(() => identity);

      const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
        return IDL.Service({
          get: IDL.Func([], [IDL.Nat], ['query']),
        });
      };

      await expect(
        uninitializedService.createActor('test-id', idlFactory)
      ).rejects.toThrow('CanisterService is not initialized');
    });

    it('should clear cache on disposal', async () => {
      const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
        return IDL.Service({
          get: IDL.Func([], [IDL.Nat], ['query']),
        });
      };

      const canisterId = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

      await service.createActor(canisterId, idlFactory);
      await service.dispose();

      // Re-initialize
      await service.initialize();

      // Should create new actor (cache was cleared)
      const actor = await service.createActor(canisterId, idlFactory);
      expect(actor).toBeDefined();
    });
  });
});
