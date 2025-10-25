import { BackendServiceBase } from '../base/BackendServiceBase';
import { parseOrbitResult } from '../../utils/errorParsers';

export class OrbitAccountsService extends BackendServiceBase {
  /**
   * List all accounts in Orbit Station
   * Updated for Candid 0.10.18 - no Option<T> types
   */
  async listAccounts(stationId, searchTerm = null, offset = null, limit = null) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);

      // Convert to concrete values (no Option<T>)
      const searchStr = searchTerm || '';  // Empty string instead of None
      const offsetNum = offset !== null ? BigInt(offset) : BigInt(0);  // Default 0
      const limitNum = limit !== null ? limit : 50;  // Default 50

      const result = await actor.list_orbit_accounts(
        stationPrincipal,
        searchStr,
        limitNum,
        offsetNum
      );
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to list accounts:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create treasury account
   */
  async createAccount(stationId, config) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.create_treasury_account(stationPrincipal, config);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to create account:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create simple Orbit treasury account (simplified version)
   */
  async createSimpleAccount(stationId, name, description = null) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const descOpt = description ? [description] : [];
      const result = await actor.create_orbit_treasury_account(stationPrincipal, name, descOpt);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to create simple account:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fetch account balances
   */
  async fetchBalances(stationId, accountIds) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.fetch_orbit_account_balances(stationPrincipal, accountIds);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to fetch balances:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Validate account name
   */
  async validateAccountName(stationId, name) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.validate_account_name(stationPrincipal, name);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to validate account name:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get available assets for the station
   */
  async getAvailableAssets(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.get_available_assets(stationPrincipal);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to get available assets:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create transfer request
   */
  async createTransferRequest(params) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(params.stationId);

      const result = await actor.create_transfer_request(
        params.accountId,
        params.toAddress,
        params.assetId,
        params.amount,
        params.network,
        params.standard,
        params.metadata || [],
        stationPrincipal
      );
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to create transfer request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get transfer requests
   */
  async getTransferRequests(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.get_transfer_requests(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get transfer requests:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Approve transfer request
   */
  async approveTransfer(requestId, stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.approve_transfer_request(requestId, stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to approve transfer:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get account with enriched asset details
   * Returns account data with full asset metadata including balances
   */
  async getAccountWithAssets(tokenId, accountId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);

      const result = await actor.get_account_with_assets(
        tokenPrincipal,
        accountId
      );

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to get account with assets:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all assets available in the station
   * Returns complete asset metadata including decimals, symbols, and standards
   */
  async listStationAssets(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);

      const result = await actor.list_station_assets(tokenPrincipal);

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to list station assets:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get all treasury accounts with complete multi-asset balance data
   * Returns all accounts with their assets and fresh balances in one efficient call
   * This is the primary method for the Treasury Tab
   */
  async getTreasuryAccountsWithBalances(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);

      const result = await actor.get_treasury_accounts_with_balances(tokenPrincipal);

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to get treasury accounts with balances:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * List all treasury assets (alias for listStationAssets with better naming)
   * Returns complete asset metadata for all assets in the treasury
   */
  async listTreasuryAssets(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);

      const result = await actor.list_treasury_assets(tokenPrincipal);

      if (result.Ok) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return {
          success: false,
          error: result.Err
        };
      }
    } catch (error) {
      console.error('Failed to list treasury assets:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
}

export const getOrbitAccountsService = (identity) => {
  return new OrbitAccountsService(identity);
};

export default OrbitAccountsService;
