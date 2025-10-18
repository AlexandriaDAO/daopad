import { Actor, HttpAgent, type Identity } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory, canisterId } from '../../../declarations/daopad_backend';
import type { ServiceResponse, Result } from '../../../types';

const DEFAULT_BACKEND_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';
const BACKEND_CANISTER_ID = canisterId ?? DEFAULT_BACKEND_ID;

export class BackendServiceBase {
  protected identity: Identity | null;
  protected actor: any | null; // TODO: Type with generated actor interface
  protected lastIdentity: Identity | null;

  constructor(identity: Identity | null = null) {
    this.identity = identity;
    this.actor = null;
    this.lastIdentity = null;
  }

  async getActor(): Promise<any> { // TODO: Return typed actor
    // Cache actor but recreate if identity changed
    if (!this.actor || this.identity !== this.lastIdentity) {
      const isLocal = import.meta.env.VITE_DFX_NETWORK === 'local';
      const host = isLocal ? 'http://localhost:4943' : 'https://icp0.io';

      const agent = new HttpAgent({
        identity: this.identity,
        host,
      });

      if (isLocal) {
        await agent.fetchRootKey();
      }

      this.actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });

      this.lastIdentity = this.identity;
    }

    return this.actor;
  }

  /**
   * Wrap backend Result<T, String> responses
   */
  wrapResult<T>(result: Result<T, string>): ServiceResponse<T> {
    if ('Ok' in result) {
      return { success: true, data: result.Ok };
    } else if ('Err' in result) {
      return { success: false, error: result.Err };
    }
    return { success: false, error: 'Invalid response format' };
  }

  /**
   * Wrap backend Option<T> responses
   */
  wrapOption<T>(result: [] | [T]): ServiceResponse<T | null> {
    if (Array.isArray(result) && result.length > 0) {
      return { success: true, data: result[0] };
    } else if (Array.isArray(result)) {
      return { success: true, data: null };
    }
    return { success: false, error: 'Invalid option format' };
  }

  /**
   * Convert to Principal with proper error handling
   * @throws Error if value is invalid or cannot be converted
   */
  toPrincipal(value: string | Principal | null | undefined): Principal {
    if (!value) {
      throw new Error('Principal value required');
    }

    if (value instanceof Principal) {
      return value;
    }

    if (typeof value === 'string') {
      try {
        return Principal.fromText(value);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Invalid principal string: ${value} (${message})`);
      }
    }

    // Handle objects with toText method (e.g., from Candid)
    if (typeof (value as any).toText === 'function') {
      return value as Principal;
    }

    // Try converting toString() to Principal as last resort
    if (typeof (value as any).toString === 'function') {
      try {
        return Principal.fromText((value as any).toString());
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Cannot convert to Principal: ${typeof value} (${message})`);
      }
    }

    throw new Error(`Cannot convert to Principal: unsupported type ${typeof value}`);
  }

  /**
   * Convert Principal to text
   */
  toText(principal: string | Principal | null | undefined): string {
    if (!principal) {
      throw new Error('Principal value required for conversion to text');
    }

    if (typeof principal === 'string') {
      return principal;
    }

    if (typeof (principal as any).toText === 'function') {
      return (principal as Principal).toText();
    }

    if (typeof (principal as any).toString === 'function') {
      return (principal as any).toString();
    }

    return String(principal);
  }
}
