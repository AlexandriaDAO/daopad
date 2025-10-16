// Hardcoded operation thresholds from backend proposals/types.rs
export const OPERATION_THRESHOLDS = [
  // Critical (90%)
  { name: 'System Upgrade', threshold: 90, risk: 'CRITICAL', duration: 72 },
  { name: 'System Restore', threshold: 90, risk: 'CRITICAL', duration: 72 },
  { name: 'Set Disaster Recovery', threshold: 90, risk: 'CRITICAL', duration: 24 },
  { name: 'Manage System Info', threshold: 90, risk: 'CRITICAL', duration: 24 },

  // Treasury (75%)
  { name: 'Transfer', threshold: 75, risk: 'HIGH', duration: 48 },
  { name: 'Add Account', threshold: 75, risk: 'HIGH', duration: 48 },
  { name: 'Edit Account', threshold: 75, risk: 'HIGH', duration: 48 },

  // Governance (70%)
  { name: 'Edit Permission', threshold: 70, risk: 'HIGH', duration: 24 },
  { name: 'Add Request Policy', threshold: 70, risk: 'HIGH', duration: 24 },
  { name: 'Edit Request Policy', threshold: 70, risk: 'HIGH', duration: 24 },
  { name: 'Remove Request Policy', threshold: 70, risk: 'HIGH', duration: 24 },

  // Canisters (60%)
  { name: 'Create External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Configure External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Change External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Call External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Fund External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Monitor External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Snapshot External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Restore External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Prune External Canister', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },

  // Automation (60%)
  { name: 'Add Named Rule', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Edit Named Rule', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },
  { name: 'Remove Named Rule', threshold: 60, risk: 'MEDIUM-HIGH', duration: 24 },

  // Users (50%)
  { name: 'Add User', threshold: 50, risk: 'MEDIUM', duration: 24 },
  { name: 'Edit User', threshold: 50, risk: 'MEDIUM', duration: 24 },
  { name: 'Remove User', threshold: 50, risk: 'MEDIUM', duration: 24 },
  { name: 'Add User Group', threshold: 50, risk: 'MEDIUM', duration: 24 },
  { name: 'Edit User Group', threshold: 50, risk: 'MEDIUM', duration: 24 },
  { name: 'Remove User Group', threshold: 50, risk: 'MEDIUM', duration: 24 },

  // Assets (40%)
  { name: 'Add Asset', threshold: 40, risk: 'LOW', duration: 24 },
  { name: 'Edit Asset', threshold: 40, risk: 'LOW', duration: 24 },
  { name: 'Remove Asset', threshold: 40, risk: 'LOW', duration: 24 },

  // Address Book (30%)
  { name: 'Add Address Book Entry', threshold: 30, risk: 'LOW', duration: 24 },
  { name: 'Edit Address Book Entry', threshold: 30, risk: 'LOW', duration: 24 },
  { name: 'Remove Address Book Entry', threshold: 30, risk: 'LOW', duration: 24 },
];

export const getRiskColor = (risk) => {
  switch(risk) {
    case 'CRITICAL': return 'text-red-600';
    case 'HIGH': return 'text-orange-600';
    case 'MEDIUM-HIGH': return 'text-yellow-600';
    case 'MEDIUM': return 'text-blue-600';
    case 'LOW': return 'text-green-600';
    default: return 'text-gray-600';
  }
};