/**
 * Orbit Station helper utilities for working with Orbit data structures
 */

/**
 * Check if a value is an Orbit error variant
 */
export function isOrbitError(value) {
  return value && typeof value === 'object' && 'Err' in value;
}

/**
 * Check if a value is an Orbit Ok variant
 */
export function isOrbitOk(value) {
  return value && typeof value === 'object' && 'Ok' in value;
}

/**
 * Extract the value from an Orbit Result type
 */
export function unwrapOrbitResult(result, defaultValue = null) {
  if (isOrbitOk(result)) {
    return result.Ok;
  }
  if (isOrbitError(result)) {
    console.error('Orbit error:', result.Err);
    return defaultValue;
  }
  return defaultValue;
}

/**
 * Format UUIDs for display (shorter format)
 */
export function formatUuid(uuid) {
  if (!uuid) return '';
  // Show first 8 chars for brevity
  return uuid.substring(0, 8) + '...';
}

/**
 * Format Principal for display
 */
export function formatPrincipal(principal) {
  if (!principal) return '';
  const str = principal.toString();
  if (str.length <= 20) return str;
  return `${str.substring(0, 8)}...${str.substring(str.length - 8)}`;
}

/**
 * Format timestamps from RFC3339 to human-readable
 */
export function formatTimestamp(timestamp, options = {}) {
  if (!timestamp) return '';

  try {
    const date = new Date(timestamp);
    const { format = 'short', relative = false } = options;

    if (relative) {
      return getRelativeTime(date);
    }

    if (format === 'short') {
      return date.toLocaleDateString();
    }

    if (format === 'long') {
      return date.toLocaleString();
    }

    return date.toISOString();
  } catch (error) {
    console.error('Invalid timestamp:', timestamp);
    return timestamp;
  }
}

/**
 * Get relative time string (e.g., "2 hours ago")
 */
export function getRelativeTime(date) {
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 7) {
    return date.toLocaleDateString();
  }
  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  }
  if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  }
  if (diffMins > 0) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  }
  return 'Just now';
}

/**
 * Format user status for display
 */
export function formatUserStatus(status) {
  if (!status) return 'Unknown';

  if (typeof status === 'string') {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  // Handle variant types
  if ('Active' in status) return 'Active';
  if ('Inactive' in status) return 'Inactive';
  if ('Archived' in status) return 'Archived';

  return 'Unknown';
}

/**
 * Format request status for display
 */
export function formatRequestStatus(status) {
  if (!status) return 'Unknown';

  if (typeof status === 'string') {
    return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  }

  // Handle variant types
  if ('Created' in status) return 'Created';
  if ('Approved' in status) return 'Approved';
  if ('Rejected' in status) return 'Rejected';
  if ('Cancelled' in status) return 'Cancelled';
  if ('Failed' in status) return 'Failed';
  if ('Completed' in status) return 'Completed';
  if ('Processing' in status) return 'Processing';
  if ('Scheduled' in status) return 'Scheduled';

  return 'Unknown';
}

/**
 * Get status badge color based on status
 */
export function getStatusColor(status) {
  const statusStr = typeof status === 'string' ? status : Object.keys(status)[0];

  switch (statusStr?.toLowerCase()) {
    case 'active':
    case 'approved':
    case 'completed':
      return 'success';
    case 'inactive':
    case 'pending':
    case 'created':
    case 'scheduled':
      return 'warning';
    case 'archived':
    case 'rejected':
    case 'cancelled':
    case 'failed':
      return 'destructive';
    case 'processing':
      return 'secondary';
    default:
      return 'default';
  }
}

/**
 * Format operation type for display
 */
export function formatOperationType(operation) {
  if (!operation) return 'Unknown';

  const operationMap = {
    AddUser: 'Add User',
    EditUser: 'Edit User',
    AddUserGroup: 'Add User Group',
    EditUserGroup: 'Edit User Group',
    RemoveUserGroup: 'Remove User Group',
    AddAccount: 'Add Account',
    EditAccount: 'Edit Account',
    AddAsset: 'Add Asset',
    EditAsset: 'Edit Asset',
    Transfer: 'Transfer',
    AddAddressBookEntry: 'Add Address',
    EditAddressBookEntry: 'Edit Address',
    RemoveAddressBookEntry: 'Remove Address',
    CreateRequest: 'Create Request',
    EditRequest: 'Edit Request',
    CancelRequest: 'Cancel Request',
    AddRequestPolicy: 'Add Policy',
    EditRequestPolicy: 'Edit Policy',
    RemoveRequestPolicy: 'Remove Policy',
    CallExternalCanister: 'Call Canister',
    ChangeExternalCanister: 'Change Canister',
    FundExternalCanister: 'Fund Canister',
    ConfigureExternalCanister: 'Configure Canister',
    UpgradeStation: 'Upgrade Station',
    SetDisasterRecovery: 'Set Recovery',
    ChangeMetadata: 'Change Metadata',
    ManageSystemInfo: 'Manage System',
  };

  if (typeof operation === 'string') {
    return operationMap[operation] || operation;
  }

  // Handle variant types
  const key = Object.keys(operation)[0];
  return operationMap[key] || key;
}

/**
 * Get operation icon based on type
 */
export function getOperationIcon(operation) {
  const key = typeof operation === 'string' ? operation : Object.keys(operation)[0];

  const iconMap = {
    AddUser: 'UserPlus',
    EditUser: 'UserPen',
    AddUserGroup: 'UsersPlus',
    EditUserGroup: 'UsersPen',
    RemoveUserGroup: 'UsersX',
    AddAccount: 'WalletPlus',
    EditAccount: 'WalletPen',
    AddAsset: 'CoinsPlus',
    EditAsset: 'CoinsPen',
    Transfer: 'ArrowRightLeft',
    AddAddressBookEntry: 'BookPlus',
    EditAddressBookEntry: 'BookPen',
    RemoveAddressBookEntry: 'BookX',
    CreateRequest: 'FilePlus',
    EditRequest: 'FilePen',
    CancelRequest: 'FileX',
    AddRequestPolicy: 'ShieldPlus',
    EditRequestPolicy: 'ShieldPen',
    RemoveRequestPolicy: 'ShieldX',
    CallExternalCanister: 'Terminal',
    ChangeExternalCanister: 'Settings',
    FundExternalCanister: 'Coins',
    ConfigureExternalCanister: 'Cog',
    UpgradeStation: 'Upload',
    SetDisasterRecovery: 'ShieldAlert',
    ChangeMetadata: 'FileText',
    ManageSystemInfo: 'Settings2',
  };

  return iconMap[key] || 'File';
}

/**
 * Build permission matrix from user privileges
 */
export function buildPermissionMatrix(privileges = []) {
  const matrix = {
    canCreateUser: false,
    canEditUser: false,
    canCreateAccount: false,
    canEditAccount: false,
    canTransfer: false,
    canCreateAsset: false,
    canEditAsset: false,
    canManagePolicies: false,
    canManageSystem: false,
    canApprove: false,
  };

  privileges.forEach((privilege) => {
    const key = typeof privilege === 'string' ? privilege : Object.keys(privilege)[0];

    switch (key) {
      case 'AddUser':
        matrix.canCreateUser = true;
        break;
      case 'EditUser':
        matrix.canEditUser = true;
        break;
      case 'AddAccount':
        matrix.canCreateAccount = true;
        break;
      case 'EditAccount':
        matrix.canEditAccount = true;
        break;
      case 'Transfer':
        matrix.canTransfer = true;
        break;
      case 'AddAsset':
        matrix.canCreateAsset = true;
        break;
      case 'EditAsset':
        matrix.canEditAsset = true;
        break;
      case 'AddRequestPolicy':
      case 'EditRequestPolicy':
      case 'RemoveRequestPolicy':
        matrix.canManagePolicies = true;
        break;
      case 'ManageSystemInfo':
      case 'UpgradeStation':
        matrix.canManageSystem = true;
        break;
      case 'ApproveRequest':
        matrix.canApprove = true;
        break;
    }
  });

  return matrix;
}

/**
 * Sort users by name
 */
export function sortUsersByName(users, ascending = true) {
  return [...users].sort((a, b) => {
    const nameA = a.name?.toLowerCase() || '';
    const nameB = b.name?.toLowerCase() || '';
    return ascending ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
  });
}

/**
 * Sort requests by creation time
 */
export function sortRequestsByTime(requests, newest = true) {
  return [...requests].sort((a, b) => {
    const timeA = new Date(a.created_at || 0);
    const timeB = new Date(b.created_at || 0);
    return newest ? timeB - timeA : timeA - timeB;
  });
}

/**
 * Group users by their groups
 */
export function groupUsersByGroup(users) {
  const grouped = {};

  users.forEach((user) => {
    if (!user.groups || user.groups.length === 0) {
      if (!grouped['No Group']) {
        grouped['No Group'] = [];
      }
      grouped['No Group'].push(user);
    } else {
      user.groups.forEach((group) => {
        const groupName = group.name || group.id;
        if (!grouped[groupName]) {
          grouped[groupName] = [];
        }
        grouped[groupName].push(user);
      });
    }
  });

  return grouped;
}

/**
 * Filter users by search term
 */
export function filterUsersBySearch(users, searchTerm) {
  if (!searchTerm) return users;

  const term = searchTerm.toLowerCase();
  return users.filter((user) => {
    return (
      user.name?.toLowerCase().includes(term) ||
      user.id?.toLowerCase().includes(term) ||
      user.identities?.some(id => id.toString().includes(term))
    );
  });
}

export default {
  isOrbitError,
  isOrbitOk,
  unwrapOrbitResult,
  formatUuid,
  formatPrincipal,
  formatTimestamp,
  getRelativeTime,
  formatUserStatus,
  formatRequestStatus,
  getStatusColor,
  formatOperationType,
  getOperationIcon,
  buildPermissionMatrix,
  sortUsersByName,
  sortRequestsByTime,
  groupUsersByGroup,
  filterUsersBySearch,
};