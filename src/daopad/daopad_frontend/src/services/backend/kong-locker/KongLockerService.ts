import { BackendServiceBase } from '../base/BackendServiceBase';

export class KongLockerService extends BackendServiceBase {
  /**
   * Register with Kong Locker
   */
  async register(kongLockerPrincipal) {
    try {
      const actor = await this.getActor();
      const principal = this.toPrincipal(kongLockerPrincipal);
      const result = await actor.register_with_kong_locker(principal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to register with Kong Locker:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get my Kong Locker canister
   */
  async getMyCanister() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_kong_locker_canister();
      return this.wrapOption(result);
    } catch (error) {
      console.error('Failed to get Kong Locker canister:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Unregister from Kong Locker
   */
  async unregister() {
    try {
      const actor = await this.getActor();
      const result = await actor.unregister_kong_locker();
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to unregister Kong Locker:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all Kong Locker registrations (admin)
   */
  async listAllRegistrations() {
    try {
      const actor = await this.getActor();
      const result = await actor.list_all_kong_locker_registrations();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to list registrations:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get voting power for token
   */
  async getVotingPower(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);
      const result = await actor.get_my_voting_power_for_token(tokenPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get voting power:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Kong Locker positions
   */
  async getPositions() {
    try {
      // Backend doesn't have this method - return empty for now
      // TODO: Implement direct Kong Lock canister query
      console.warn('getPositions not implemented - returning empty array');
      return {
        success: true,
        data: [],
        warning: 'Position fetching not yet implemented'
      };
    } catch (error) {
      console.error('Failed to get positions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get Kong Locker factory principal
   */
  async getFactoryPrincipal() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_kong_locker_factory_principal();
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get factory principal:', error);
      return { success: false, error: error.message };
    }
  }
}

export const getKongLockerService = (identity) => {
  return new KongLockerService(identity);
};

export default KongLockerService;
