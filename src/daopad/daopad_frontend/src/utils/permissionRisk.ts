// Risk calculation for permissions based on security analysis
const ADMIN_GROUP_ID = '00000000-0000-4000-8000-000000000000';
const OPERATOR_GROUP_ID = '00000000-0000-4000-8000-000000000001';

const RISK_MATRIX = {
  critical: [
    'Account.Transfer',
    'Asset.Transfer',
    'System.Upgrade',
    'Permission.Update',
    'RequestPolicy.Update',
    'ExternalCanister.Change',
    'ExternalCanister.Call',
    'System.Restore',
  ],
  high: [
    'Account.Create',
    'Account.Update',
    'User.Create',
    'User.Update',
    'UserGroup.Create',
    'UserGroup.Update',
    'Asset.Delete',
    'ExternalCanister.Monitor',
    'RequestPolicy.Remove',
  ],
  medium: [
    'ExternalCanister.Create',
    'ExternalCanister.Fund',
    'Asset.Create',
    'Asset.Update',
    'Asset.Remove',
    'UserGroup.Remove',
    'NamedRule.Update',
    'NamedRule.Remove',
  ],
};

export function calculatePermissionRisk(permission) {
  const resourceType = getResourceType(permission.resource);

  // Filter out both admin AND operator for "admin only" detection
  const nonDefaultGroups = (permission.allow?.user_groups || [])
    .filter(g => g !== ADMIN_GROUP_ID && g !== OPERATOR_GROUP_ID);

  // If only admin/operator have access, it's lower risk
  if (nonDefaultGroups.length === 0) {
    return { level: 'none', groups: [] };
  }

  // Risk based on resource type AND which groups have access
  if (RISK_MATRIX.critical.includes(resourceType)) {
    return { level: 'critical', groups: nonDefaultGroups };
  }
  if (RISK_MATRIX.high.includes(resourceType)) {
    return { level: 'high', groups: nonDefaultGroups };
  }
  if (RISK_MATRIX.medium.includes(resourceType)) {
    return { level: 'medium', groups: nonDefaultGroups };
  }

  return { level: 'low', groups: nonDefaultGroups };
}

function getResourceType(resource) {
  if (!resource) return 'Unknown';
  const keys = Object.keys(resource);
  if (keys.length === 0) return 'Unknown';
  const resourceType = keys[0];
  const action = resource[resourceType];
  return `${resourceType}.${formatAction(action)}`;
}

function formatAction(action) {
  if (!action) return 'Unknown';
  if (typeof action === 'string') return action;
  if (typeof action === 'object') {
    const keys = Object.keys(action);
    if (keys.length > 0) return keys[0];
  }
  return 'Unknown';
}
