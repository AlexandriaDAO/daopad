// ⚠️ IMPORTANT: These thresholds are hardcoded from:
// daopad_backend/src/proposals/types.rs (OrbitRequestType enum)
// If backend thresholds change, update this file accordingly!

export interface OperationThreshold {
  name: string;
  threshold: number;
  risk: string;
  duration: number;
  // Mutability metadata for Operating Agreement
  category: 'Treasury' | 'Governance' | 'System' | 'Users' | 'Assets' | 'External' | 'Address Book';
  modifies: string[];
  proposerRequirement: string;
  effectiveWhen: string;
  examples: string[];
}

export const OPERATION_THRESHOLDS: OperationThreshold[] = [
  // ===== CRITICAL SYSTEM OPERATIONS (90%) =====
  {
    name: 'System Upgrade',
    threshold: 90,
    risk: 'CRITICAL',
    duration: 72,
    category: 'System',
    modifies: [
      'Article VII: Technical Infrastructure',
      'Article IX: Disaster Recovery',
      'Core Station canister code'
    ],
    proposerRequirement: 'Any member with 100+ voting power',
    effectiveWhen: 'Immediately upon execution',
    examples: [
      'Upgrading to new Orbit Station version',
      'Patching critical security vulnerabilities',
      'Adding new system capabilities',
      'Implementing protocol improvements'
    ]
  },
  {
    name: 'System Restore',
    threshold: 90,
    risk: 'CRITICAL',
    duration: 72,
    category: 'System',
    modifies: [
      'Article VII: Technical Infrastructure',
      'All Station state (accounts, users, policies)',
      'Entire DAO configuration'
    ],
    proposerRequirement: 'Disaster Recovery Committee or Admin',
    effectiveWhen: 'Immediately upon execution (irreversible)',
    examples: [
      'Restoring from backup after catastrophic failure',
      'Rolling back to pre-upgrade snapshot',
      'Emergency recovery from corrupted state',
      'Disaster recovery activation'
    ]
  },
  {
    name: 'Set Disaster Recovery',
    threshold: 90,
    risk: 'CRITICAL',
    duration: 24,
    category: 'System',
    modifies: [
      'Article IX: Disaster Recovery Committee',
      'Emergency override procedures',
      'Backup restoration authority'
    ],
    proposerRequirement: 'Any member with 100+ voting power',
    effectiveWhen: 'Immediately upon execution',
    examples: [
      'Appointing disaster recovery committee members',
      'Setting emergency recovery quorum threshold',
      'Establishing backup restoration procedures',
      'Configuring emergency override authority'
    ]
  },
  {
    name: 'Manage System Info',
    threshold: 90,
    risk: 'CRITICAL',
    duration: 24,
    category: 'System',
    modifies: [
      'Article I: Company Name',
      'Article VII: Cycle Management Strategy',
      'System snapshot retention policies'
    ],
    proposerRequirement: 'Any member with 100+ voting power',
    effectiveWhen: 'Immediately upon execution',
    examples: [
      'Changing DAO legal entity name',
      'Modifying cycle obtaining strategy (ICP to cycles conversion)',
      'Adjusting backup snapshot retention limits',
      'Configuring system-level parameters'
    ]
  },

  // ===== TREASURY OPERATIONS (75%) =====
  {
    name: 'Transfer',
    threshold: 75,
    risk: 'HIGH',
    duration: 48,
    category: 'Treasury',
    modifies: [
      'Article V: Treasury Account Balances',
      'Article XII: Financial Records',
      'On-chain asset holdings'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon execution (irreversible)',
    examples: [
      'Sending ICP to exchange for trading',
      'Paying contractor invoices in USDC',
      'Distributing profits to members',
      'Moving funds to cold storage wallet'
    ]
  },
  {
    name: 'Add Account',
    threshold: 75,
    risk: 'HIGH',
    duration: 48,
    category: 'Treasury',
    modifies: [
      'Article V: Treasury Account Structure',
      'Account permission configurations',
      'Asset-to-account mappings'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon creation',
    examples: [
      'Creating dedicated account for marketing expenses',
      'Establishing separate R&D funding pool',
      'Setting up multi-sig account for high-value assets',
      'Creating operational expense account'
    ]
  },
  {
    name: 'Edit Account',
    threshold: 75,
    risk: 'HIGH',
    duration: 48,
    category: 'Treasury',
    modifies: [
      'Article V: Account Permissions',
      'Article IV: Transfer Approval Policies',
      'Account asset configurations'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon execution',
    examples: [
      'Changing account name for clarity',
      'Adding new asset type to existing account',
      'Modifying transfer approval requirements',
      'Updating account permission restrictions'
    ]
  },

  // ===== GOVERNANCE OPERATIONS (70%) =====
  {
    name: 'Edit Permission',
    threshold: 70,
    risk: 'HIGH',
    duration: 24,
    category: 'Governance',
    modifies: [
      'Article IV: Access Control Rules',
      'Resource permission configurations',
      'Who can read/modify specific resources'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon execution',
    examples: [
      'Making treasury balance publicly readable',
      'Restricting account modifications to admin group',
      'Granting specific users permission to create proposals',
      'Changing who can access address book'
    ]
  },
  {
    name: 'Add Request Policy',
    threshold: 70,
    risk: 'HIGH',
    duration: 24,
    category: 'Governance',
    modifies: [
      'Article IV: Approval Rules',
      'Operation-specific approval requirements',
      'Governance decision-making process'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon creation',
    examples: [
      'Requiring 3 admin approvals for transfers over $10k',
      'Setting auto-approval for small asset additions',
      'Creating quorum rule for external canister calls',
      'Establishing percentage-based approval thresholds'
    ]
  },
  {
    name: 'Edit Request Policy',
    threshold: 70,
    risk: 'HIGH',
    duration: 24,
    category: 'Governance',
    modifies: [
      'Article IV: Existing Approval Rules',
      'Operation approval thresholds',
      'Governance process parameters'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon execution',
    examples: [
      'Increasing transfer approval quorum from 2 to 3',
      'Changing approval percentage from 50% to 60%',
      'Modifying which user group can approve operations',
      'Adjusting approval rule logic (AND/OR conditions)'
    ]
  },
  {
    name: 'Remove Request Policy',
    threshold: 70,
    risk: 'HIGH',
    duration: 24,
    category: 'Governance',
    modifies: [
      'Article IV: Approval Rules (deletion)',
      'Operation approval requirements',
      'Governance process scope'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon deletion',
    examples: [
      'Removing outdated approval policy after governance change',
      'Deleting test policy created during development',
      'Eliminating redundant approval rules',
      'Simplifying approval process by removing unnecessary policies'
    ]
  },

  // ===== EXTERNAL CANISTER OPERATIONS (60%) =====
  {
    name: 'Create External Canister',
    threshold: 60,
    risk: 'MEDIUM-HIGH',
    duration: 24,
    category: 'External',
    modifies: [
      'Article VIII: External Canister Registry',
      'DAO-controlled canister inventory',
      'Cycle allocation and funding responsibilities'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'After canister deployment and registration',
    examples: [
      'Deploying new NFT marketplace canister',
      'Creating governance frontend canister',
      'Launching token swap interface',
      'Setting up analytics dashboard canister'
    ]
  },
  {
    name: 'Configure External Canister',
    threshold: 60,
    risk: 'MEDIUM-HIGH',
    duration: 24,
    category: 'External',
    modifies: [
      'Article VIII: Canister Settings',
      'Canister memory/compute allocations',
      'Canister lifecycle (soft delete, full delete)'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon execution',
    examples: [
      'Adjusting canister compute allocation limits',
      'Configuring canister memory allocation',
      'Soft-deleting deprecated canister from Orbit',
      'Permanently deleting old test canister'
    ]
  },
  {
    name: 'Change External Canister',
    threshold: 60,
    risk: 'MEDIUM-HIGH',
    duration: 24,
    category: 'External',
    modifies: [
      'Article VIII: Canister Code',
      'Deployed WASM modules',
      'Canister state (install/reinstall/upgrade)'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon code deployment',
    examples: [
      'Upgrading frontend canister to v2.0',
      'Installing new WASM module on fresh canister',
      'Reinstalling canister to reset state',
      'Applying security patch to production canister'
    ]
  },
  {
    name: 'Call External Canister',
    threshold: 60,
    risk: 'MEDIUM-HIGH',
    duration: 24,
    category: 'External',
    modifies: [
      'Article VIII: External Canister State',
      'Target canister data and configuration',
      'Cross-canister interaction results'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon method execution',
    examples: [
      'Calling NFT mint method on NFT canister',
      'Executing governance proposal on external DAO',
      'Triggering token distribution via external contract',
      'Invoking admin method on controlled service'
    ]
  },
  {
    name: 'Fund External Canister',
    threshold: 60,
    risk: 'MEDIUM-HIGH',
    duration: 24,
    category: 'External',
    modifies: [
      'Article VIII: Canister Cycle Balances',
      'Treasury cycle allocation',
      'External canister operational funding'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon cycle transfer',
    examples: [
      'Sending 10T cycles to frontend canister',
      'Emergency funding for canister low on cycles',
      'Batch funding all DAO-controlled canisters',
      'Allocating cycles for new feature deployment'
    ]
  },
  {
    name: 'Monitor External Canister',
    threshold: 60,
    risk: 'MEDIUM-HIGH',
    duration: 24,
    category: 'External',
    modifies: [
      'Article VIII: Canister Monitoring Rules',
      'Automatic cycle refill configurations',
      'Canister health tracking settings'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon configuration',
    examples: [
      'Enable auto-refill when cycles drop below 1T',
      'Set monitoring to fund based on estimated runtime',
      'Configure always-fund strategy at fixed intervals',
      'Stop automatic monitoring for deprecated canister'
    ]
  },
  {
    name: 'Snapshot External Canister',
    threshold: 60,
    risk: 'MEDIUM-HIGH',
    duration: 24,
    category: 'External',
    modifies: [
      'Article VIII: Canister Backup Storage',
      'Snapshot inventory and retention',
      'Disaster recovery capabilities'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'After snapshot creation completes',
    examples: [
      'Creating backup before major canister upgrade',
      'Taking snapshot for regulatory compliance',
      'Capturing state before risky operation',
      'Creating recovery point for disaster preparedness'
    ]
  },
  {
    name: 'Restore External Canister',
    threshold: 60,
    risk: 'MEDIUM-HIGH',
    duration: 24,
    category: 'External',
    modifies: [
      'Article VIII: Canister State (restored)',
      'Canister data and configuration',
      'Operational state rolled back to snapshot'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon restoration (irreversible)',
    examples: [
      'Rolling back failed canister upgrade',
      'Restoring from backup after data corruption',
      'Recovering canister to known-good state',
      'Reverting to pre-incident snapshot'
    ]
  },
  {
    name: 'Prune External Canister',
    threshold: 60,
    risk: 'MEDIUM-HIGH',
    duration: 24,
    category: 'External',
    modifies: [
      'Article VIII: Canister Storage Resources',
      'Snapshot deletion and cleanup',
      'WASM chunk store and state removal'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon deletion (irreversible)',
    examples: [
      'Deleting old snapshots to free storage',
      'Removing obsolete WASM chunks',
      'Cleaning up canister state after migration',
      'Pruning unused resources for cost savings'
    ]
  },

  // ===== AUTOMATION / NAMED RULES (60%) =====
  {
    name: 'Add Named Rule',
    threshold: 60,
    risk: 'MEDIUM-HIGH',
    duration: 24,
    category: 'Governance',
    modifies: [
      'Article IV: Reusable Policy Rules',
      'Named rule registry',
      'Governance automation templates'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon creation',
    examples: [
      'Creating "High Value Transfer" rule for reuse',
      'Defining "Admin Quorum" template for multiple operations',
      'Establishing "Community Vote" rule pattern',
      'Building reusable approval logic for efficiency'
    ]
  },
  {
    name: 'Edit Named Rule',
    threshold: 60,
    risk: 'MEDIUM-HIGH',
    duration: 24,
    category: 'Governance',
    modifies: [
      'Article IV: Named Rule Definitions',
      'Existing rule logic and parameters',
      'All policies referencing this rule'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon execution',
    examples: [
      'Updating "Admin Quorum" threshold from 2 to 3',
      'Changing rule description for clarity',
      'Modifying rule logic to add new conditions',
      'Adjusting percentage-based rule parameters'
    ]
  },
  {
    name: 'Remove Named Rule',
    threshold: 60,
    risk: 'MEDIUM-HIGH',
    duration: 24,
    category: 'Governance',
    modifies: [
      'Article IV: Named Rule Registry (deletion)',
      'Governance template availability',
      'Reusable rule inventory'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon deletion',
    examples: [
      'Deleting obsolete rule no longer in use',
      'Removing test rule created during development',
      'Cleaning up unused governance templates',
      'Eliminating redundant rule definitions'
    ]
  },

  // ===== USER MANAGEMENT (50%) =====
  {
    name: 'Add User',
    threshold: 50,
    risk: 'MEDIUM',
    duration: 24,
    category: 'Users',
    modifies: [
      'Article II: Member List',
      'Article VI: User Roles and Groups',
      'Voting power distribution (if user has LP tokens)'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon user creation',
    examples: [
      'Adding new DAO contributor as member',
      'Registering new admin to operator group',
      'Onboarding new community member',
      'Creating service account for automation'
    ]
  },
  {
    name: 'Edit User',
    threshold: 50,
    risk: 'MEDIUM',
    duration: 24,
    category: 'Users',
    modifies: [
      'Article II: User Status',
      'Article VI: User Group Membership',
      'User identities (IC principals)'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon execution',
    examples: [
      'Setting user to Inactive status',
      'Adding user to admin or operator group',
      'Updating user identity principals',
      'Cancelling pending requests from departed member'
    ]
  },
  {
    name: 'Remove User',
    threshold: 50,
    risk: 'MEDIUM',
    duration: 24,
    category: 'Users',
    modifies: [
      'Article II: Member List (deletion)',
      'Article VI: Group Memberships',
      'Active user count'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon deletion',
    examples: [
      'Removing departed team member',
      'Deleting test account',
      'Cleaning up inactive user accounts',
      'Removing compromised identity'
    ]
  },
  {
    name: 'Add User Group',
    threshold: 50,
    risk: 'MEDIUM',
    duration: 24,
    category: 'Users',
    modifies: [
      'Article VI: Group Structure',
      'Organizational unit definitions',
      'Permission assignment capabilities'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon group creation',
    examples: [
      'Creating "Treasury Managers" group',
      'Establishing "Developer" role group',
      'Defining "Community Moderators" group',
      'Setting up "Auditor" group for oversight'
    ]
  },
  {
    name: 'Edit User Group',
    threshold: 50,
    risk: 'MEDIUM',
    duration: 24,
    category: 'Users',
    modifies: [
      'Article VI: Group Names',
      'Group metadata and descriptions',
      'Organizational clarity'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon execution',
    examples: [
      'Renaming "Dev Team" to "Engineering Team"',
      'Updating group description for clarity',
      'Correcting typo in group name',
      'Rebranding group for organizational changes'
    ]
  },
  {
    name: 'Remove User Group',
    threshold: 50,
    risk: 'MEDIUM',
    duration: 24,
    category: 'Users',
    modifies: [
      'Article VI: Group Structure (deletion)',
      'All policies referencing this group',
      'User memberships cleared'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon deletion',
    examples: [
      'Deleting obsolete "Beta Testers" group',
      'Removing temporary "Launch Team" group',
      'Cleaning up unused organizational units',
      'Eliminating redundant group definitions'
    ]
  },

  // ===== ASSETS (40%) =====
  {
    name: 'Add Asset',
    threshold: 40,
    risk: 'LOW',
    duration: 24,
    category: 'Assets',
    modifies: [
      'Article V: Supported Asset Registry',
      'Treasury asset type availability',
      'Blockchain and token standard configurations'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon asset registration',
    examples: [
      'Adding ICP token support',
      'Registering USDC stablecoin',
      'Enabling BTC asset type',
      'Adding custom ICRC-1 token'
    ]
  },
  {
    name: 'Edit Asset',
    threshold: 40,
    risk: 'LOW',
    duration: 24,
    category: 'Assets',
    modifies: [
      'Article V: Asset Metadata',
      'Asset symbol, name, or blockchain',
      'Asset configuration parameters'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon execution',
    examples: [
      'Updating asset name from "Bitcoin" to "BTC"',
      'Changing asset symbol for consistency',
      'Modifying asset metadata (logo, decimals)',
      'Adjusting blockchain or standard specification'
    ]
  },
  {
    name: 'Remove Asset',
    threshold: 40,
    risk: 'LOW',
    duration: 24,
    category: 'Assets',
    modifies: [
      'Article V: Asset Registry (deletion)',
      'Treasury asset type availability',
      'Account asset configurations'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon deletion',
    examples: [
      'Removing deprecated test token',
      'Deleting asset no longer used by DAO',
      'Cleaning up obsolete asset configurations',
      'Eliminating assets with zero balances'
    ]
  },

  // ===== ADDRESS BOOK (30%) =====
  {
    name: 'Add Address Book Entry',
    threshold: 30,
    risk: 'LOW',
    duration: 24,
    category: 'Address Book',
    modifies: [
      'Article V: Trusted Address Registry',
      'Known counterparty database',
      'Transfer destination shortcuts'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon entry creation',
    examples: [
      'Adding exchange deposit address',
      'Registering trusted partner wallet',
      'Saving frequently used payment address',
      'Recording KYC-verified counterparty'
    ]
  },
  {
    name: 'Edit Address Book Entry',
    threshold: 30,
    risk: 'LOW',
    duration: 24,
    category: 'Address Book',
    modifies: [
      'Article V: Address Metadata',
      'Address labels and tags',
      'KYC status or risk scores'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon execution',
    examples: [
      'Updating address owner name',
      'Changing address labels for clarity',
      'Modifying KYC verification status',
      'Adjusting risk score metadata'
    ]
  },
  {
    name: 'Remove Address Book Entry',
    threshold: 30,
    risk: 'LOW',
    duration: 24,
    category: 'Address Book',
    modifies: [
      'Article V: Address Registry (deletion)',
      'Trusted counterparty list',
      'Transfer destination shortcuts'
    ],
    proposerRequirement: 'Any member with voting power',
    effectiveWhen: 'Immediately upon deletion',
    examples: [
      'Deleting old exchange address',
      'Removing outdated partner wallet',
      'Cleaning up unused addresses',
      'Eliminating compromised addresses'
    ]
  },
];

export const getRiskColor = (risk: string) => {
  switch(risk) {
    case 'CRITICAL': return 'text-red-600';
    case 'HIGH': return 'text-orange-600';
    case 'MEDIUM-HIGH': return 'text-yellow-600';
    case 'MEDIUM': return 'text-blue-600';
    case 'LOW': return 'text-green-600';
    default: return 'text-gray-600';
  }
};

// Helper function to get operations by category
export const getOperationsByCategory = (category: string): OperationThreshold[] => {
  return OPERATION_THRESHOLDS.filter(op => op.category === category);
};

// Helper function to get all affected articles for an operation
export const getAffectedArticles = (operationName: string): string[] => {
  const op = OPERATION_THRESHOLDS.find(o => o.name === operationName);
  return op?.modifies || [];
};

// Helper to get unique categories
export const getCategories = (): Array<{name: string, description: string}> => {
  return [
    { name: 'System', description: 'Critical system upgrades, disaster recovery, and core configuration' },
    { name: 'Treasury', description: 'Treasury accounts, asset transfers, and fund management' },
    { name: 'Governance', description: 'Voting rules, permissions, policies, and decision-making processes' },
    { name: 'External', description: 'External canister creation, upgrades, funding, and management' },
    { name: 'Users', description: 'Member management, roles, groups, and organizational structure' },
    { name: 'Assets', description: 'Supported asset types, token standards, and blockchain configurations' },
    { name: 'Address Book', description: 'Trusted addresses, counterparty registry, and transfer destinations' },
  ];
};
