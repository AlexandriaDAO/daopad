/**
 * Core library exports
 * Infrastructure and utilities used throughout the application
 */

// Service registry and setup
export { ServiceRegistry, serviceRegistry } from './ServiceRegistry';
export { setupServices, initializeServices, disposeServices, resetServices } from './setupServices';

// Types
export { Result } from './types/Result';

// Errors
export {
  BaseError,
  CanisterError,
  OrbitError,
  ValidationError,
  BackendError,
} from './errors';
