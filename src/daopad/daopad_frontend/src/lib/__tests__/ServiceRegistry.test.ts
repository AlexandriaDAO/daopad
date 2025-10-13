import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ServiceRegistry } from '../ServiceRegistry';
import { IService } from '../../services/interfaces/IService';

// Mock service for testing
class MockService implements IService {
  readonly name = 'MockService';
  private _isInitialized = false;
  initializeCalled = false;
  disposeCalled = false;

  async initialize(): Promise<void> {
    this._isInitialized = true;
    this.initializeCalled = true;
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
    this.disposeCalled = true;
  }

  isInitialized(): boolean {
    return this._isInitialized;
  }
}

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;

  beforeEach(() => {
    registry = new ServiceRegistry();
  });

  describe('register', () => {
    it('should register a service', () => {
      registry.register('test', () => new MockService());
      expect(registry.has('test')).toBe(true);
    });

    it('should throw if service already registered', () => {
      registry.register('test', () => new MockService());
      expect(() => registry.register('test', () => new MockService())).toThrow(
        "Service 'test' is already registered"
      );
    });

    it('should register non-singleton service', () => {
      let callCount = 0;
      registry.register(
        'test',
        () => {
          callCount++;
          return new MockService();
        },
        false
      );

      registry.get('test');
      registry.get('test');
      expect(callCount).toBe(2);
    });
  });

  describe('get', () => {
    it('should return singleton instance', () => {
      registry.register('test', () => new MockService(), true);
      const service1 = registry.get('test');
      const service2 = registry.get('test');
      expect(service1).toBe(service2);
    });

    it('should return new instance for non-singleton', () => {
      registry.register('test', () => new MockService(), false);
      const service1 = registry.get('test');
      const service2 = registry.get('test');
      expect(service1).not.toBe(service2);
    });

    it('should throw if service not registered', () => {
      expect(() => registry.get('nonexistent')).toThrow(
        "Service 'nonexistent' is not registered"
      );
    });
  });

  describe('has', () => {
    it('should return true for registered service', () => {
      registry.register('test', () => new MockService());
      expect(registry.has('test')).toBe(true);
    });

    it('should return false for unregistered service', () => {
      expect(registry.has('test')).toBe(false);
    });
  });

  describe('unregister', () => {
    it('should unregister a service', async () => {
      registry.register('test', () => new MockService());
      expect(registry.has('test')).toBe(true);
      await registry.unregister('test');
      expect(registry.has('test')).toBe(false);
    });

    it('should dispose instance before unregistering', async () => {
      const factory = vi.fn(() => new MockService());
      registry.register('test', factory);
      const service = registry.get<MockService>('test');
      await registry.unregister('test');
      expect(service.disposeCalled).toBe(true);
    });
  });

  describe('initializeAll', () => {
    it('should initialize all singleton services', async () => {
      const service1 = new MockService();
      const service2 = new MockService();

      registry.register('service1', () => service1, true);
      registry.register('service2', () => service2, true);

      await registry.initializeAll();

      expect(service1.initializeCalled).toBe(true);
      expect(service2.initializeCalled).toBe(true);
    });

    it('should not initialize non-singleton services', async () => {
      const service = new MockService();
      registry.register('service', () => service, false);

      await registry.initializeAll();

      expect(service.initializeCalled).toBe(false);
    });

    it('should not initialize already initialized services', async () => {
      const service = new MockService();
      const initSpy = vi.spyOn(service, 'initialize');
      registry.register('service', () => service, true);

      // Get service (creates instance)
      registry.get('service');
      await service.initialize();

      // Initialize all
      await registry.initializeAll();

      // Should only be called once (from manual initialize, not from initializeAll)
      expect(initSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('disposeAll', () => {
    it('should dispose all singleton services', async () => {
      const service1 = new MockService();
      const service2 = new MockService();

      registry.register('service1', () => service1, true);
      registry.register('service2', () => service2, true);

      // Get services to create instances
      registry.get('service1');
      registry.get('service2');

      await registry.disposeAll();

      expect(service1.disposeCalled).toBe(true);
      expect(service2.disposeCalled).toBe(true);
    });
  });

  describe('getRegisteredServices', () => {
    it('should return all registered service names', () => {
      registry.register('service1', () => new MockService());
      registry.register('service2', () => new MockService());

      const names = registry.getRegisteredServices();
      expect(names).toEqual(['service1', 'service2']);
    });

    it('should return empty array when no services registered', () => {
      const names = registry.getRegisteredServices();
      expect(names).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should dispose all services and clear registry', async () => {
      const service = new MockService();
      registry.register('service', () => service, true);
      registry.get('service');

      await registry.clear();

      expect(service.disposeCalled).toBe(true);
      expect(registry.has('service')).toBe(false);
    });
  });
});
