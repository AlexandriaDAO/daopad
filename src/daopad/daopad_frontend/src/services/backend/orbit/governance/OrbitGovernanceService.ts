import { BackendServiceBase } from '../../base/BackendServiceBase';

export class OrbitGovernanceService extends BackendServiceBase {
  /**
   * Get Orbit Station system information
   * @param {string|Principal} stationId - Orbit Station ID
   */
  async getSystemInfo(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.get_orbit_system_info(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get system info:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get governance statistics for a token
   * @param {string|Principal} tokenId - Token canister ID
   */
  async getGovernanceStats(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_governance_stats(tokenPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get governance stats:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get proposal configuration for a specific proposal type
   * @param {string|Principal} tokenId - Token canister ID
   * @param {Object} proposalType - Proposal type variant
   */
  async getProposalConfig(tokenId, proposalType) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_proposal_config(tokenPrincipal, proposalType);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get proposal config:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get voting thresholds for a token
   * @param {string|Principal} tokenId - Token canister ID
   */
  async getVotingThresholds(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_voting_thresholds(tokenPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get voting thresholds:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get default voting thresholds
   */
  async getDefaultVotingThresholds() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_default_voting_thresholds();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get default voting thresholds:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Set voting thresholds for a token
   * @param {string|Principal} tokenId - Token canister ID
   * @param {Object} thresholds - Threshold configuration
   */
  async setVotingThresholds(tokenId, thresholds) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.set_voting_thresholds(tokenPrincipal, thresholds);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to set voting thresholds:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Initialize default thresholds for a token
   * @param {string|Principal} tokenId - Token canister ID
   */
  async initializeDefaultThresholds(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.initialize_default_thresholds(tokenPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to initialize default thresholds:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get members with high voting power
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {number} minVotingPower - Minimum voting power threshold
   */
  async getHighVpMembers(stationId, minVotingPower) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.get_high_vp_members(stationPrincipal, minVotingPower);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get high VP members:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if a proposal has passed based on voting thresholds
   * @param {string|Principal} tokenId - Token canister ID
   * @param {Object} proposalType - Proposal type variant
   * @param {number} yesVotes - Yes votes count
   * @param {number} noVotes - No votes count
   * @param {number} totalVp - Total voting power
   */
  async hasProposalPassed(tokenId, proposalType, yesVotes, noVotes, totalVp) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.has_proposal_passed(
        tokenPrincipal,
        proposalType,
        yesVotes,
        noVotes,
        totalVp
      );
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to check if proposal passed:', error);
      return { success: false, error: error.message };
    }
  }
}

export const getOrbitGovernanceService = (identity) => {
  return new OrbitGovernanceService(identity);
};

export default OrbitGovernanceService;
