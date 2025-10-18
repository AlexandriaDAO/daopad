import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory, canisterId } from '../../../declarations/daopad_backend';

const DEFAULT_BACKEND_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';
const BACKEND_CANISTER_ID = canisterId ?? DEFAULT_BACKEND_ID;

export class BackendServiceBase {
  constructor(identity = null) {
    this.identity = identity;
    this.actor = null;
    this.lastIdentity = null;
  }

  async getActor() {
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
  wrapResult(result) {
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
  wrapOption(result) {
    if (Array.isArray(result) && result.length > 0) {
      return { success: true, data: result[0] };
    } else if (Array.isArray(result)) {
      return { success: true, data: null };
    }
    return { success: false, error: 'Invalid option format' };
  }

  /**
   * Convert to Principal (handles string/Principal/object)
   */
  toPrincipal(value) {
    if (!value) return null;
    if (value instanceof Principal) return value;
    if (typeof value === 'string') return Principal.fromText(value);
    if (typeof value.toText === 'function') return value;
    if (typeof value.toString === 'function') {
      try {
        return Principal.fromText(value.toString());
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Convert Principal to text
   */
  toText(principal) {
    if (!principal) return null;
    if (typeof principal === 'string') return principal;
    if (typeof principal.toText === 'function') return principal.toText();
    if (typeof principal.toString === 'function') return principal.toString();
    return String(principal);
  }
}
