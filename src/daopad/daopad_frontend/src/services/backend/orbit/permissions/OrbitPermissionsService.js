import { BackendServiceBase } from '../../base/BackendServiceBase';
import { formatOrbitError } from '../../utils/errorParsers';

export class OrbitPermissionsService extends BackendServiceBase {
  /**
   * List all permissions for a station
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {Array|null} resources - Optional filter by resource types
   */
  async listPermissions(stationId, resources = null) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.list_permissions(
        stationPrincipal,
        resources === null ? [] : [resources]  // Wrap in Option properly
      );

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Error listing permissions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get specific permission for a resource
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {Object} resource - Resource to check permission for
   */
  async getPermission(stationId, resource) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.get_permission(
        stationPrincipal,
        resource
      );

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Error getting permission:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Request a permission change (creates a request that needs approval)
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {Object} resource - Resource to change permission for
   * @param {Object} authScope - Authorization scope
   * @param {Array} users - Optional list of users
   * @param {Array} userGroups - Optional list of user groups
   */
  async requestPermissionChange(stationId, resource, authScope, users, userGroups) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);

      // Backend expects Option types, frontend must wrap
      const result = await actor.request_permission_change(
        stationPrincipal,
        resource,
        authScope ? [authScope] : [],      // Wrap for Option<AuthScope>
        users?.length > 0 ? [users] : [],  // Wrap for Option<Vec<String>>
        userGroups?.length > 0 ? [userGroups] : []  // Wrap for Option<Vec<String>>
      );

      if ('Ok' in result) {
        return { success: true, requestId: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Error requesting permission change:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user's permissions for a station
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {string} userId - User ID
   */
  async getUserPermissions(stationId, userId) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.get_user_permissions(stationPrincipal, userId);

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Error getting user permissions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has permission for a specific resource
   * @param {string|Principal} stationId - Orbit Station ID
   * @param {string} userId - User ID
   * @param {Object} resource - Resource to check
   */
  async checkUserPermission(stationId, userId, resource) {
    try {
      const actor = await this.getActor();
      const stationPrincipal = this.toPrincipal(stationId);
      const result = await actor.check_user_permission(
        stationPrincipal,
        userId,
        resource
      );

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return {
          success: false,
          error: formatOrbitError(result.Err)
        };
      }
    } catch (error) {
      console.error('Error checking user permission:', error);
      return { success: false, error: error.message };
    }
  }
}

export const getOrbitPermissionsService = (identity) => {
  return new OrbitPermissionsService(identity);
};

export default OrbitPermissionsService;
