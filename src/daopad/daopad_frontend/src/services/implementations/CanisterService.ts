import { Actor, ActorSubclass, HttpAgent, Identity } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { Principal } from '@dfinity/principal';
import { BaseService } from '../base/BaseService';
import { ICanisterService } from '../interfaces/ICanisterService';
import { Result } from '../../lib/types/Result';
import { CanisterError } from '../../lib/errors/CanisterError';

/**
 * Service for Internet Computer canister operations
 * Manages actor creation, caching, and call/query operations
 */
export class CanisterService extends BaseService implements ICanisterService {
  readonly name = 'CanisterService';

  private agent: HttpAgent | null = null;
  private actorCache = new Map<string, ActorSubclass<any>>();
  private identityProvider: () => Identity | null;

  constructor(identityProvider: () => Identity | null) {
    super();
    this.identityProvider = identityProvider;
  }

  protected async onInitialize(): Promise<void> {
    this.identity = this.identityProvider();

    if (!this.identity) {
      throw new Error('Identity is required for CanisterService');
    }

    // Determine host based on environment
    const isLocal = import.meta.env.VITE_DFX_NETWORK === 'local';
    const host = isLocal ? 'http://localhost:4943' : 'https://icp0.io';

    // Create HTTP agent
    this.agent = new HttpAgent({
      identity: this.identity,
      host,
    });

    // Fetch root key for local development
    if (isLocal) {
      try {
        await this.agent.fetchRootKey();
      } catch (error) {
        console.warn('Failed to fetch root key:', error);
      }
    }
  }

  protected async onDispose(): Promise<void> {
    this.agent = null;
    this.actorCache.clear();
  }

  async createActor<T>(
    canisterId: string,
    idlFactory: IDL.InterfaceFactory
  ): Promise<ActorSubclass<T>> {
    this.ensureInitialized();

    if (!this.agent) {
      throw new CanisterError('HTTP Agent not initialized');
    }

    // Check cache
    const cacheKey = canisterId;
    if (this.actorCache.has(cacheKey)) {
      return this.actorCache.get(cacheKey)!;
    }

    try {
      // Create actor
      const actor = Actor.createActor<T>(idlFactory, {
        agent: this.agent,
        canisterId: Principal.fromText(canisterId),
      });

      // Cache actor
      this.actorCache.set(cacheKey, actor);

      return actor;
    } catch (error) {
      throw CanisterError.fromRejection(error, { canisterId });
    }
  }

  async call<T>(
    method: string,
    args: unknown[],
    canisterId: string
  ): Promise<Result<T, CanisterError>> {
    try {
      this.ensureInitialized();

      if (!this.agent) {
        return Result.err(new CanisterError('HTTP Agent not initialized'));
      }

      // Note: This is a simplified implementation
      // In practice, you'd need to create an actor and call the method
      // For now, this shows the pattern
      const principal = Principal.fromText(canisterId);

      // Make the call through the agent
      const result = await this.agent.call(principal, {
        methodName: method,
        arg: this.encodeArgs(args),
      });

      return Result.ok(result as T);
    } catch (error) {
      return Result.err(
        CanisterError.fromRejection(error, { method, canisterId })
      );
    }
  }

  async query<T>(
    method: string,
    args: unknown[],
    canisterId: string
  ): Promise<Result<T, CanisterError>> {
    try {
      this.ensureInitialized();

      if (!this.agent) {
        return Result.err(new CanisterError('HTTP Agent not initialized'));
      }

      // Note: This is a simplified implementation
      // In practice, you'd need to create an actor and call the method
      const principal = Principal.fromText(canisterId);

      // Make the query through the agent
      const result = await this.agent.query(principal, {
        methodName: method,
        arg: this.encodeArgs(args),
      });

      return Result.ok(result as T);
    } catch (error) {
      return Result.err(
        CanisterError.fromRejection(error, { method, canisterId })
      );
    }
  }

  clearActorCache(): void {
    this.actorCache.clear();
  }

  /**
   * Encode arguments for canister calls
   * In practice, this would use IDL encoding
   */
  private encodeArgs(args: unknown[]): ArrayBuffer {
    // Simplified implementation
    // Real implementation would use IDL.encode
    return new ArrayBuffer(0);
  }
}
