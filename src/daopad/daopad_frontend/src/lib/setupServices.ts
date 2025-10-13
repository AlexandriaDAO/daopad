import { Identity } from '@dfinity/agent';
import { serviceRegistry } from './ServiceRegistry';
import { CanisterService } from '../services/implementations/CanisterService';
import { ICanisterService } from '../services/interfaces/ICanisterService';

/**
 * Setup and register all services
 * This should be called once at application startup
 *
 * @param identityProvider - Function that returns current identity
 */
export function setupServices(identityProvider: () => Identity | null): void {
  // Check if already registered (avoid duplicate registration)
  if (serviceRegistry.getRegisteredServices().length > 0) {
    console.warn('Services already registered. Use resetServices() to re-initialize.');
    return;
  }

  // Register CanisterService
  serviceRegistry.register<ICanisterService>(
    'CanisterService',
    () => new CanisterService(identityProvider),
    true // singleton
  );

  // Additional services will be registered here in future phases:
  // - OrbitStationService (Phase 3)
  // - DAOPadBackendService (Phase 3)
  // - KongLockerService (Phase 3)
}

/**
 * Reset and re-initialize all services
 * Useful when identity changes (e.g., login/logout)
 *
 * @param identityProvider - Function that returns new identity
 */
export async function resetServices(identityProvider: () => Identity | null): Promise<void> {
  try {
    // Dispose all existing services
    await serviceRegistry.clear();

    // Re-register services
    setupServices(identityProvider);

    // Initialize all services
    await initializeServices();

    console.log('✅ Services reset successfully');
  } catch (error) {
    console.error('❌ Failed to reset services:', error);
    throw error;
  }
}

/**
 * Initialize all registered services
 * Should be called after authentication
 */
export async function initializeServices(): Promise<void> {
  try {
    await serviceRegistry.initializeAll();
    console.log('✅ All services initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize services:', error);
    throw error;
  }
}

/**
 * Dispose all services
 * Should be called on logout or app shutdown
 */
export async function disposeServices(): Promise<void> {
  try {
    await serviceRegistry.disposeAll();
    console.log('✅ All services disposed successfully');
  } catch (error) {
    console.error('❌ Failed to dispose services:', error);
    throw error;
  }
}
