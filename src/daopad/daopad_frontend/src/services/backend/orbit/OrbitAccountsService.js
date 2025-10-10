import { BackendServiceBase } from '../base/BackendServiceBase';
import { parseOrbitResult } from '../../utils/errorParsers';

export class OrbitAccountsService extends BackendServiceBase {
  /**
   * List all accounts in Orbit Station
   */
  async listAccounts(stationId, searchTerm = null, offset = null, limit = null) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);

      const searchTermOpt = searchTerm ? [searchTerm] : [];
      const offsetOpt = offset !== null ? [offset] : [];
      const limitOpt = limit !== null ? [limit] : [];

      const result = await actor.list_orbit_accounts(
        stationPrincipal,
        searchTermOpt,
        offsetOpt,
        limitOpt
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
}

export const getOrbitAccountsService = (identity) => {
  return new OrbitAccountsService(identity);
};

export default OrbitAccountsService;
