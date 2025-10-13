import { describe, it, expect, beforeEach } from 'vitest';
import { BaseService } from '../BaseService';

// Concrete test implementation of BaseService
class TestService extends BaseService {
  readonly name = 'TestService';
  onInitializeCalled = false;
  onDisposeCalled = false;

  protected async onInitialize(): Promise<void> {
    this.onInitializeCalled = true;
    // Simulate some async initialization
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  protected async onDispose(): Promise<void> {
    this.onDisposeCalled = true;
    // Simulate some async cleanup
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  // Expose protected methods for testing
  public testEnsureInitialized(): void {
    this.ensureInitialized();
  }

  public testGetIdentity() {
    return this.getIdentity();
  }
}

describe('BaseService', () => {
  let service: TestService;

  beforeEach(() => {
    service = new TestService();
  });

  describe('initialize', () => {
    it('should initialize service', async () => {
      expect(service.isInitialized()).toBe(false);
      await service.initialize();
      expect(service.isInitialized()).toBe(true);
      expect(service.onInitializeCalled).toBe(true);
    });

    it('should be idempotent', async () => {
      await service.initialize();
      expect(service.onInitializeCalled).toBe(true);

      // Reset flag
      service.onInitializeCalled = false;

      // Initialize again
      await service.initialize();
      expect(service.onInitializeCalled).toBe(false); // Should not call again
      expect(service.isInitialized()).toBe(true);
    });
  });

  describe('dispose', () => {
    it('should dispose initialized service', async () => {
      await service.initialize();
      expect(service.isInitialized()).toBe(true);

      await service.dispose();
      expect(service.isInitialized()).toBe(false);
      expect(service.onDisposeCalled).toBe(true);
    });

    it('should be idempotent', async () => {
      await service.initialize();
      await service.dispose();
      expect(service.onDisposeCalled).toBe(true);

      // Reset flag
      service.onDisposeCalled = false;

      // Dispose again
      await service.dispose();
      expect(service.onDisposeCalled).toBe(false); // Should not call again
      expect(service.isInitialized()).toBe(false);
    });

    it('should do nothing if not initialized', async () => {
      expect(service.isInitialized()).toBe(false);
      await service.dispose();
      expect(service.onDisposeCalled).toBe(false);
    });

    it('should clear identity', async () => {
      await service.initialize();
      expect(service.testGetIdentity()).toBeNull();

      await service.dispose();
      expect(service.testGetIdentity()).toBeNull();
    });
  });

  describe('isInitialized', () => {
    it('should return false initially', () => {
      expect(service.isInitialized()).toBe(false);
    });

    it('should return true after initialization', async () => {
      await service.initialize();
      expect(service.isInitialized()).toBe(true);
    });

    it('should return false after disposal', async () => {
      await service.initialize();
      await service.dispose();
      expect(service.isInitialized()).toBe(false);
    });
  });

  describe('ensureInitialized', () => {
    it('should not throw when initialized', async () => {
      await service.initialize();
      expect(() => service.testEnsureInitialized()).not.toThrow();
    });

    it('should throw when not initialized', () => {
      expect(() => service.testEnsureInitialized()).toThrow(
        'TestService is not initialized. Call initialize() first.'
      );
    });
  });

  describe('identity management', () => {
    it('should return null initially', () => {
      expect(service.testGetIdentity()).toBeNull();
    });

    it('should clear identity on dispose', async () => {
      await service.initialize();
      await service.dispose();
      expect(service.testGetIdentity()).toBeNull();
    });
  });
});
