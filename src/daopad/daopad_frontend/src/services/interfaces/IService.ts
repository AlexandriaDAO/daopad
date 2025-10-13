/**
 * Base interface that all services must implement
 * Provides lifecycle management and identity
 */
export interface IService {
  /**
   * Unique identifier for this service
   */
  readonly name: string;

  /**
   * Initialize the service
   * Should be idempotent - calling multiple times should be safe
   */
  initialize(): Promise<void>;

  /**
   * Clean up resources when service is no longer needed
   * Should be idempotent - calling multiple times should be safe
   */
  dispose(): Promise<void>;

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean;
}
