import { BackendServiceBase } from '../base/BackendServiceBase';

export class ProposalService extends BackendServiceBase {
  /**
   * Create DAO transition proposal
   */
  async createProposal(tokenId, stationId, options = {}) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const stationPrincipal = this.toPrincipal(stationId);

      const proposalOptions = {
        title: options.title || 'DAO Transition Proposal',
        description: options.description || '',
        voting_period_hours: options.votingPeriodHours || 168, // 1 week
      };

      const result = await actor.create_dao_transition_proposal(
        tokenPrincipal,
        stationPrincipal,
        proposalOptions
      );
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to create proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Vote on proposal
   */
  async vote(proposalId, vote) {
    try {
      const actor = await this.getActor();
      const voteVariant = vote === 'yes' ? { Yes: null } : { No: null };
      const result = await actor.vote_on_proposal(proposalId, voteVariant);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to vote:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get proposal details
   */
  async getProposal(proposalId) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_proposal(proposalId);
      return this.wrapOption(result);
    } catch (error) {
      console.error('Failed to get proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List active proposals
   */
  async listActive() {
    try {
      const actor = await this.getActor();
      const result = await actor.list_active_proposals();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to list proposals:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get active proposal for token
   */
  async getActiveForToken(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_active_proposal_for_token(tokenPrincipal);
      return this.wrapOption(result);
    } catch (error) {
      console.error('Failed to get active proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Execute proposal (finalize result)
   */
  async execute(proposalId) {
    try {
      const actor = await this.getActor();
      const result = await actor.execute_proposal(proposalId);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to execute proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get proposal votes
   */
  async getVotes(proposalId) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_proposal_votes(proposalId);
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get votes:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Cleanup expired proposals (admin function)
   */
  async cleanupExpiredProposals() {
    try {
      const actor = await this.getActor();
      const result = await actor.cleanup_expired_proposals();
      if ('Ok' in result) {
        return { success: true, data: Number(result.Ok) };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to cleanup expired proposals:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Orbit request proposal
   */
  async getOrbitRequestProposal(tokenId, requestId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_orbit_request_proposal(tokenPrincipal, requestId);
      return this.wrapOption(result);
    } catch (error) {
      console.error('Failed to get orbit request proposal:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List Orbit request proposals for a token
   */
  async listOrbitRequestProposals(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.list_orbit_request_proposals(tokenPrincipal);
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to list orbit request proposals:', error);
      return { success: false, error: error.message };
    }
  }
}

export const getProposalService = (identity) => {
  return new ProposalService(identity);
};

export default ProposalService;
