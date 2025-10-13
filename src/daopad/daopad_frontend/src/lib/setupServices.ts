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
  // Clear any existing registrations (useful for hot reload in development)
  if (serviceRegistry.getRegisteredServices().length > 0) {
    console.warn('Services already registered. This may indicate a hot reload or duplicate setup call.');
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
