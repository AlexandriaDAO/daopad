import { Identity } from '@dfinity/agent';
import { IService } from '../interfaces/IService';

/**
 * Base service class with common lifecycle management
 * All concrete services should extend this class
 */
export abstract class BaseService implements IService {
  abstract readonly name: string;

  protected identity: Identity | null = null;
  protected _isInitialized = false;

  /**
   * Initialize the service
   * Idempotent - safe to call multiple times
   */
  async initialize(): Promise<void> {
    if (this._isInitialized) {
      return;
    }

    await this.onInitialize();
    this._isInitialized = true;
  }

  /**
   * Dispose the service and clean up resources
   * Idempotent - safe to call multiple times
   */
  async dispose(): Promise<void> {
    if (!this._isInitialized) {
      return;
    }

    await this.onDispose();
    this._isInitialized = false;
    this.identity = null;
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * Template method for subclass initialization logic
   */
  protected abstract onInitialize(): Promise<void>;

  /**
   * Template method for subclass cleanup logic
   */
  protected abstract onDispose(): Promise<void>;

  /**
   * Ensure service is initialized before use
   * Throws if not initialized
   */
  protected ensureInitialized(): void {
    if (!this._isInitialized) {
      throw new Error(`${this.name} is not initialized. Call initialize() first.`);
    }
  }

  /**
   * Set the identity for this service
   * Should be called before initialize() or during onInitialize()
   */
  protected setIdentity(identity: Identity | null): void {
    this.identity = identity;
  }

  /**
   * Get the current identity
   */
  protected getIdentity(): Identity | null {
    return this.identity;
  }
}
