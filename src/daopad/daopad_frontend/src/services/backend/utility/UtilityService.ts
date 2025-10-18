import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { BackendServiceBase } from '../base/BackendServiceBase';

// ICRC1 Token Metadata IDL
const icrc1MetadataIDL = ({ IDL }) => {
  const Value = IDL.Variant({
    Text: IDL.Text,
    Nat: IDL.Nat,
    Int: IDL.Int,
    Blob: IDL.Vec(IDL.Nat8),
  });
  const MetadataEntry = IDL.Tuple(IDL.Text, Value);
  return IDL.Service({
    icrc1_metadata: IDL.Func([], [IDL.Vec(MetadataEntry)], ['query']),
  });
};

export class UtilityService extends BackendServiceBase {
  /**
   * Get backend canister principal
   */
  async getBackendPrincipal() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_backend_principal();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get backend principal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Backend health check
   */
  async healthCheck() {
    try {
      const actor = await this.getActor();
      const result = await actor.health_check();
      return { success: true, data: result };
    } catch (error) {
      console.error('Health check failed:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Test backend integration
   */
  async testBackendIntegration(payload = {}) {
    try {
      const actor = await this.getActor();
      const result = await actor.health_check();
      return {
        success: true,
        data: {
          message: 'Backend integration healthy',
          payload,
          result,
        },
      };
    } catch (error) {
      console.error('Backend integration test failed', error);
      return { success: false, error: error?.message ?? 'Unknown error' };
    }
  }

  /**
   * Get token metadata (static method - doesn't need backend)
   * Fetches ICRC1 metadata directly from token canister
   */
  static async getTokenMetadata(tokenCanisterId) {
    try {
      console.log('Fetching metadata for:', tokenCanisterId);
      const agent = new HttpAgent({ host: 'https://ic0.app' });

      // Always convert to string first, then to Principal
      let canisterIdString;
      if (typeof tokenCanisterId === 'string') {
        canisterIdString = tokenCanisterId;
      } else if (tokenCanisterId && tokenCanisterId.toText) {
        canisterIdString = tokenCanisterId.toText();
      } else if (tokenCanisterId && tokenCanisterId.toString) {
        canisterIdString = tokenCanisterId.toString();
      } else {
        throw new Error('Invalid canister ID format');
      }

      // Now convert string to Principal for Actor.createActor
      const canisterPrincipal = Principal.fromText(canisterIdString);
      console.log('Creating actor with Principal:', canisterPrincipal.toText());

      const tokenActor = Actor.createActor(icrc1MetadataIDL, {
        agent,
        canisterId: canisterPrincipal,
      });

      const metadata = await tokenActor.icrc1_metadata();

      // Parse metadata array into object
      const parsedMetadata = {};
      for (const [key, value] of metadata) {
        // Extract the value from the variant
        if (value.Text !== undefined) {
          parsedMetadata[key] = value.Text;
        } else if (value.Nat !== undefined) {
          parsedMetadata[key] = value.Nat.toString();
        } else if (value.Int !== undefined) {
          parsedMetadata[key] = value.Int.toString();
        } else if (value.Blob !== undefined) {
          parsedMetadata[key] = value.Blob;
        }
      }

      return {
        success: true,
        data: {
          name: parsedMetadata['icrc1:name'] || parsedMetadata['name'] || 'Unknown Token',
          symbol: parsedMetadata['icrc1:symbol'] || parsedMetadata['symbol'] || 'N/A',
          description: parsedMetadata['icrc1:description'] || parsedMetadata['description'] || '',
          logo: parsedMetadata['icrc1:logo'] || parsedMetadata['logo'] || '',
          decimals: parsedMetadata['icrc1:decimals'] || parsedMetadata['decimals'] || '8',
          fee: parsedMetadata['icrc1:fee'] || parsedMetadata['fee'] || '0',
          raw: parsedMetadata,
        },
      };
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      return {
        success: false,
        error: error.message,
        data: {
          name: 'Unknown Token',
          symbol: 'N/A',
          description: '',
          logo: '',
          decimals: '8',
          fee: '0',
          raw: {},
        },
      };
    }
  }
}

export const getUtilityService = (identity) => {
  return new UtilityService(identity);
};

export default UtilityService;
