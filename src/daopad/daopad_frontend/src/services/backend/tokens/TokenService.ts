import { BackendServiceBase } from '../base/BackendServiceBase';

export class TokenService extends BackendServiceBase {
  /**
   * Get Orbit Station for a token
   */
  async getStationForToken(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_orbit_station_for_token(tokenPrincipal);
      return this.wrapOption(result);
    } catch (error) {
      console.error('Failed to get station for token:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get DAO overview stats (treasury, proposals, members)
   * Returns aggregate statistics for the Overview tab
   *
   * @param {string|Principal} tokenId - The token canister ID
   * @returns {Promise<{success: boolean, data?: DaoOverviewStats, error?: string}>}
   */
  async getDaoOverview(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_dao_overview(tokenPrincipal);

      // Handle Result<DaoOverviewStats, String> response
      return this.wrapResult(result);
    } catch (error) {
      console.error('[TokenService] getDaoOverview error:', error);
      return { success: false, error: error.message || 'Unknown error' };
    }
  }

  /**
   * List all registered Orbit Stations (token -> station mappings)
   */
  async listAllStations() {
    try {
      const actor = await this.getActor();
      const result = await actor.list_all_orbit_stations();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to list all stations:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get my locked tokens (from Kong Locker)
   */
  async getMyLockedTokens() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_locked_tokens();
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get locked tokens:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Propose Orbit Station link for a token
   */
  async proposeStationLink(tokenId, stationId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.propose_orbit_station_link(tokenPrincipal, stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to propose station link:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Kong Locker factory principal
   */
  async getKongLockerFactory() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_kong_locker_factory_principal();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get Kong Locker factory:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get my voting power for a specific token
   */
  async getMyVotingPowerForToken(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_my_voting_power_for_token(tokenPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get my voting power:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get total voting power for a specific token
   */
  async getTotalVotingPowerForToken(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_total_voting_power_for_token(tokenPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get total voting power:', error);
      return { success: false, error: error.message };
    }
  }
}

export const getTokenService = (identity) => {
  return new TokenService(identity);
};

export default TokenService;
