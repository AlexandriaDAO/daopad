import { ActorSubclass, Identity } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { IService } from './IService';

/**
 * Service interface for Internet Computer canister operations
 * Provides actor creation and caching for IC canister communication
 */
export interface ICanisterService extends IService {
  /**
   * Create an actor for a canister
   * Actors are cached to avoid recreating them
   *
   * @param canisterId - Principal text or canister ID
   * @param idlFactory - IDL interface factory from generated declarations
   * @returns Actor instance for making canister calls
   *
   * @example
   * ```typescript
   * const actor = await canisterService.createActor<MyCanisterActor>(
   *   'rrkah-fqaaa-aaaaa-aaaaq-cai',
   *   myCanisterIdlFactory
   * );
   * const result = await actor.my_method();
   * ```
   */
  createActor<T>(
    canisterId: string,
    idlFactory: IDL.InterfaceFactory
  ): Promise<ActorSubclass<T>>;

  /**
   * Clear actor cache
   * Should be called when identity changes or when you want to force fresh actors
   */
  clearActorCache(): void;

  /**
   * Update identity and recreate agent with new identity
   * Clears actor cache and recreates HTTP agent
   *
   * @param identity - New identity to use
   */
  updateIdentity(identity: Identity): Promise<void>;
}
