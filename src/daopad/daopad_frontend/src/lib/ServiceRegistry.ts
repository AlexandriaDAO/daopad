import { IService } from '../services/interfaces/IService';

/**
 * Service factory function type
 */
type ServiceFactory<T extends IService> = () => T;

/**
 * Service entry in the registry
 */
interface ServiceEntry<T extends IService> {
  factory: ServiceFactory<T>;
  singleton: boolean;
  instance?: T;
}

/**
 * Dependency injection container for services
 * Manages service lifecycle and dependencies
 */
export class ServiceRegistry {
  private services = new Map<string, ServiceEntry<any>>();

  /**
   * Register a service with the registry
   *
   * @param name - Unique service identifier
   * @param factory - Factory function to create service instance
   * @param singleton - If true, create only one instance (default: true)
   */
  register<T extends IService>(
    name: string,
    factory: ServiceFactory<T>,
    singleton = true
  ): void {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }

    this.services.set(name, {
      factory,
      singleton,
      instance: undefined,
    });
  }

  /**
   * Get a service instance by name
   *
   * @param name - Service name
   * @returns Service instance
   * @throws If service is not registered
   */
  get<T extends IService>(name: string): T {
    const entry = this.services.get(name);

    if (!entry) {
      throw new Error(`Service '${name}' is not registered`);
    }

    // Return singleton instance if available
    if (entry.singleton && entry.instance) {
      return entry.instance as T;
    }

    // Create new instance
    const instance = entry.factory();

    // Cache singleton instance
    if (entry.singleton) {
      entry.instance = instance;
    }

    return instance as T;
  }

  /**
   * Check if a service is registered
   *
   * @param name - Service name
   * @returns True if service is registered
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Unregister a service
   *
   * @param name - Service name
   */
  async unregister(name: string): Promise<void> {
    const entry = this.services.get(name);

    if (entry?.instance) {
      await entry.instance.dispose();
    }

    this.services.delete(name);
  }

  /**
   * Initialize all registered singleton services
   * Should be called at application startup
   */
  async initializeAll(): Promise<void> {
    const initPromises: Promise<void>[] = [];

    for (const [name, entry] of this.services.entries()) {
      if (entry.singleton) {
        const instance = this.get(name);
        if (!instance.isInitialized()) {
          initPromises.push(instance.initialize());
        }
      }
    }

    await Promise.all(initPromises);
  }

  /**
   * Dispose all registered singleton services
   * Should be called at application shutdown
   */
  async disposeAll(): Promise<void> {
    const disposePromises: Promise<void>[] = [];

    for (const entry of this.services.values()) {
      if (entry.instance) {
        disposePromises.push(entry.instance.dispose());
      }
    }

    await Promise.all(disposePromises);
  }

  /**
   * Get all registered service names
   */
  getRegisteredServices(): string[] {
    return Array.from(this.services.keys());
  }

  /**
   * Clear the registry
   * Disposes all services and removes all registrations
   */
  async clear(): Promise<void> {
    await this.disposeAll();
    this.services.clear();
  }
}

/**
 * Global service registry instance
 * This should be imported and used throughout the application
 */
export const serviceRegistry = new ServiceRegistry();
