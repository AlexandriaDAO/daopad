import { BackendServiceBase } from '../base/BackendServiceBase';
import { parseOrbitResult } from '../utils/errorParsers';

export class OrbitMembersService extends BackendServiceBase {
  /**
   * List all users in Orbit Station
   */
  async listUsers(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.list_orbit_users(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to list users:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Add user to Orbit Station
   */
  async addUser(stationId, userPrincipal, name, groups = [], status = { Active: null }) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const principal = this.toPrincipal(userPrincipal);
      const result = await actor.add_user_to_orbit(stationPrincipal, principal, name, groups, status);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to add user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove user from Orbit Station
   */
  async removeUser(stationId, userId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.remove_user_from_orbit(stationPrincipal, userId);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to remove user:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Join Orbit Station as a member
   */
  async joinStation(stationId, name) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.join_orbit_station(stationPrincipal, name);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to join station:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List user groups
   */
  async listUserGroups(stationId, pagination = null) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const paginationInput = pagination ? [pagination] : [];
      const result = await actor.list_user_groups(stationPrincipal, paginationInput);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to list user groups:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get specific user group
   */
  async getUserGroup(stationId, groupId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.get_user_group(stationPrincipal, groupId);
      return parseOrbitResult(result);
    } catch (error) {
      console.error('Failed to get user group:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user permissions
   */
  async getUserPermissions(stationId, userId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.get_user_permissions(stationPrincipal, userId);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get user permissions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Verify permissions for current user
   */
  async verifyPermissions(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.verify_permissions(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to verify permissions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * List all admins
   */
  async listAllAdmins(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.list_all_admins(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to list admins:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove admin role from user
   */
  async removeAdminRole(stationId, userId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.remove_admin_role(stationPrincipal, userId);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to remove admin role:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Downgrade user to operator
   */
  async downgradeToOperator(stationId, userId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.downgrade_to_operator(stationPrincipal, userId);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to downgrade to operator:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get admin count
   */
  async getAdminCount(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.get_admin_count(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get admin count:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Sync voting power permissions
   */
  async syncVotingPowerPermissions(stationId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.sync_voting_power_permissions(stationPrincipal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to sync voting power permissions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user voting tier
   */
  async getUserVotingTier(stationId, userPrincipal) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const principal = this.toPrincipal(userPrincipal);
      const result = await actor.get_user_voting_tier(stationPrincipal, principal);
      return this.wrapResult(result);
    } catch (error) {
      console.error('Failed to get user voting tier:', error);
      return { success: false, error: error.message };
    }
  }
}

export const getOrbitMembersService = (identity) => {
  return new OrbitMembersService(identity);
};

export default OrbitMembersService;
