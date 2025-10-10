/**
 * Utility functions to check canister operation capabilities
 * based on Orbit Station privileges
 */

export const canisterCapabilities = {
  /**
   * Check if we can perform management operations (snapshots, upgrades, settings)
   */
  canManage: (privileges) => {
    return privileges?.can_change === true;
  },

  /**
   * Check if we can add cycles to the canister
   */
  canFund: (privileges) => {
    return privileges?.can_fund === true;
  },

  /**
   * Check if we can call a specific method
   */
  canCallMethod: (privileges, methodName) => {
    if (!privileges?.can_call) return false;
    return privileges.can_call.some(m => m.method_name === methodName);
  },

  /**
   * Get permission level description for UI
   */
  getPermissionLevel: (privileges) => {
    if (!privileges) return { level: 'none', label: 'No Access', color: 'gray' };

    const canManage = privileges.can_change === true;
    const canFund = privileges.can_fund === true;
    const canCall = (privileges.can_call?.length || 0) > 0;

    if (canManage) {
      return { level: 'full', label: 'Full Management', color: 'green' };
    } else if (canFund || canCall) {
      return { level: 'limited', label: 'Limited Access', color: 'yellow' };
    } else {
      return { level: 'readonly', label: 'Read Only', color: 'blue' };
    }
  }
};
