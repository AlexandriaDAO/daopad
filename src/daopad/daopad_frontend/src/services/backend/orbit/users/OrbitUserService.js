import { BackendServiceBase } from '../../base/BackendServiceBase';

const BACKEND_CANISTER = "lwsav-iiaaa-aaaap-qp2qq-cai";

export class OrbitUserService extends BackendServiceBase {
  /**
   * List all users in Orbit Station
   * @param {string|Principal} tokenCanisterId - Token principal
   * @returns {Promise<{success: boolean, data?: User[], error?: string}>}
   */
  async listUsers(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenCanisterId);
      const result = await actor.list_orbit_users(tokenPrincipal);

      if ('Ok' in result) {
        return {
          success: true,
          data: result.Ok.map(user => ({
            id: user.id,
            name: user.name,
            status: Object.keys(user.status)[0], // 'Active' or 'Inactive'
            groups: user.groups.map(g => ({ id: g.id, name: g.name })),
            identities: user.identities.map(p => this.toText(p)),
            isAdmin: user.groups.some(g => g.name === 'Admin'),
            isOperator: user.groups.some(g => g.name === 'Operator'),
            lastModified: user.last_modification_timestamp,
          }))
        };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to list users:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Create request to remove user from admin group
   * @param {string|Principal} tokenCanisterId
   * @param {string} userId
   * @param {string} userName
   * @returns {Promise<{success: boolean, requestId?: string, error?: string}>}
   */
  async removeAdminUser(tokenCanisterId, userId, userName) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenCanisterId);
      const result = await actor.create_remove_admin_request(
        tokenPrincipal,
        userId,
        userName
      );

      if ('Ok' in result) {
        return { success: true, requestId: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to create admin removal request:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove multiple admins at once
   * @param {string|Principal} tokenCanisterId
   * @param {Array<{id: string, name: string}>} users
   * @returns {Promise<{success: boolean, results?: Array, error?: string}>}
   */
  async removeMultipleAdmins(tokenCanisterId, users) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenCanisterId);
      const userPairs = users.map(u => [u.id, u.name]);
      const results = await actor.create_remove_multiple_admins_request(
        tokenPrincipal,
        userPairs
      );

      return {
        success: true,
        results: results.map((r, idx) => ({
          user: users[idx],
          success: 'Ok' in r,
          requestId: 'Ok' in r ? r.Ok : null,
          error: 'Err' in r ? r.Err : null,
        }))
      };
    } catch (error) {
      console.error('Failed to remove multiple admins:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Filter users to get non-backend admins
   * @param {Array<User>} users - List of users
   * @returns {Array<User>} - Non-backend admin users
   */
  filterNonBackendAdmins(users) {
    return users.filter(u =>
      u.isAdmin &&
      !u.identities.includes(BACKEND_CANISTER)
    );
  }
}
