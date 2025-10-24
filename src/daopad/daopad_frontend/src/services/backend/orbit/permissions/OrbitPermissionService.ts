import { BackendServiceBase } from '../../base/BackendServiceBase';
import { Principal } from '@dfinity/principal';

export class OrbitPermissionService extends BackendServiceBase {
  /**
   * List all permissions for a station
   * @param {string|Principal} tokenId - Token principal
   * @returns {Promise<{success: boolean, data?: Permission[], error?: string}>}
   */
  async listPermissions(tokenId) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);

      // Get station ID first
      const stationResult = await actor.get_orbit_station_for_token(tokenPrincipal);
      if ('Err' in stationResult) {
        return { success: false, error: stationResult.Err };
      }
      const stationId = stationResult.Ok;

      // List permissions from the station
      const result = await actor.list_station_permissions(stationId, []);

      if ('Ok' in result) {
        return {
          success: true,
          data: result.Ok
        };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to list permissions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Remove dangerous permission from Operator group
   * @param {string|Principal} tokenId - Token principal
   * @param {any} resource - Resource object for permission
   * @returns {Promise<{success: boolean, data?: {requestId: string}, error?: string}>}
   */
  async removePermissionFromOperator(tokenId, resource) {
    try {
      const actor = await this.getActor();
      const tokenPrincipal = this.toPrincipal(tokenId);

      const result = await actor.remove_permission_from_operator_group(
        tokenPrincipal,
        resource
      );

      if ('Ok' in result) {
        return {
          success: true,
          data: { requestId: result.Ok }
        };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to remove permission from operator:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Fix all critical permissions by removing Operator group
   * @param {string|Principal} tokenId - Token principal
   * @returns {Promise<{success: boolean, data?: Array, error?: string}>}
   */
  async fixCriticalPermissions(tokenId) {
    // Define critical resources that should not be accessible to Operator group
    const criticalResources = [
      { Account: { Transfer: { Any: null } } },
      { Account: { Create: null } },
      { User: { Create: null } },
      { User: { Update: { Any: null } } },
      { Asset: { Create: null } },
      { Asset: { Update: { Any: null } } },
      { Asset: { Delete: { Any: null } } },
      { AddressBook: { Create: null } },
      { AddressBook: { Update: { Any: null } } },
      { AddressBook: { Delete: { Any: null } } }
    ];

    const results = [];

    for (const resource of criticalResources) {
      try {
        const result = await this.removePermissionFromOperator(tokenId, resource);
        results.push({
          resource: this.formatResource(resource),
          success: result.success,
          requestId: result.data?.requestId,
          error: result.error
        });
      } catch (error) {
        results.push({
          resource: this.formatResource(resource),
          success: false,
          error: error.message
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return {
      success: successCount > 0,
      data: results,
      summary: {
        total: results.length,
        success: successCount,
        failed: failCount
      }
    };
  }

  /**
   * Format resource object for display
   * @param {any} resource - Resource object
   * @returns {string} Human-readable resource name
   */
  formatResource(resource) {
    if (resource.Account?.Transfer?.Any !== undefined) return 'Account.Transfer (Any)';
    if (resource.Account?.Create !== undefined) return 'Account.Create';
    if (resource.User?.Create !== undefined) return 'User.Create';
    if (resource.User?.Update?.Any !== undefined) return 'User.Update (Any)';
    if (resource.Asset?.Create !== undefined) return 'Asset.Create';
    if (resource.Asset?.Update?.Any !== undefined) return 'Asset.Update (Any)';
    if (resource.Asset?.Delete?.Any !== undefined) return 'Asset.Delete (Any)';
    if (resource.AddressBook?.Create !== undefined) return 'AddressBook.Create';
    if (resource.AddressBook?.Update?.Any !== undefined) return 'AddressBook.Update (Any)';
    if (resource.AddressBook?.Delete?.Any !== undefined) return 'AddressBook.Delete (Any)';

    // Fallback for other resources
    return JSON.stringify(resource);
  }

  /**
   * Check if a permission has the Operator group
   * @param {any} permission - Permission object
   * @returns {boolean} True if Operator group is present
   */
  hasOperatorGroup(permission) {
    const OPERATOR_GROUP_UUID = '00000000-0000-4000-8000-000000000001';
    return permission?.allow?.user_groups?.includes(OPERATOR_GROUP_UUID) ?? false;
  }

  /**
   * Identify critical permissions that have Operator group access
   * @param {Array} permissions - List of permissions
   * @returns {Array} Critical permissions with Operator group
   */
  identifyCriticalPermissions(permissions) {
    if (!permissions || !Array.isArray(permissions)) {
      return [];
    }

    const critical = permissions.filter(p => {
      if (!this.hasOperatorGroup(p)) {
        return false;
      }

      const resource = p.resource;
      return (
        resource?.Account?.Transfer?.Any !== undefined ||
        resource?.Account?.Create !== undefined ||
        resource?.User?.Create !== undefined ||
        resource?.User?.Update !== undefined ||
        resource?.Asset !== undefined ||
        resource?.AddressBook !== undefined
      );
    });

    return critical.map(p => ({
      ...p,
      formattedResource: this.formatResource(p.resource)
    }));
  }
}