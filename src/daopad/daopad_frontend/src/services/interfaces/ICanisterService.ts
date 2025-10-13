import { ActorSubclass } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';
import { IService } from './IService';
import { Result } from '../../lib/types/Result';
import { CanisterError } from '../../lib/errors/CanisterError';

/**
 * Service interface for Internet Computer canister operations
 * Provides low-level actor creation and call/query methods
 */
export interface ICanisterService extends IService {
  /**
   * Create an actor for a canister
   * Actors are cached to avoid recreating them
   *
   * @param canisterId - Principal text or canister ID
   * @param idlFactory - IDL interface factory from generated declarations
   * @returns Actor instance for making canister calls
   */
  createActor<T>(
    canisterId: string,
    idlFactory: IDL.InterfaceFactory
  ): Promise<ActorSubclass<T>>;

  /**
   * Make an update call to a canister
   * Update calls change state and go through consensus
   *
   * @param method - Method name to call
   * @param args - Arguments array
   * @param canisterId - Target canister ID
   * @returns Result with response data or error
   */
  call<T>(
    method: string,
    args: unknown[],
    canisterId: string
  ): Promise<Result<T, CanisterError>>;

  /**
   * Make a query call to a canister
   * Query calls are read-only and faster (no consensus)
   *
   * @param method - Method name to call
   * @param args - Arguments array
   * @param canisterId - Target canister ID
   * @returns Result with response data or error
   */
  query<T>(
    method: string,
    args: unknown[],
    canisterId: string
  ): Promise<Result<T, CanisterError>>;

  /**
   * Clear actor cache
   * Useful when identity changes
   */
  clearActorCache(): void;
}
