// Exact domain enum from Orbit
export const RequestDomains = {
  All: 'all',                    // Show all requests
  Accounts: 'accounts',          // Account management
  AddressBook: 'address_book',   // Address book entries
  Transfers: 'transfers',        // Token/ICP transfers
  Users: 'users',                // User management
  ExternalCanisters: 'external_canisters', // Canister operations
  System: 'system',              // System configuration
  Assets: 'assets',              // Asset management
};

// Complete domain filtering implementation
export const REQUEST_DOMAIN_FILTERS = {
  [RequestDomains.All]: {
    id: 'all',
    types: [],  // No filter - show everything
  },
  [RequestDomains.Accounts]: {
    id: 'accounts',
    types: [
      { AddAccount: null },
      { EditAccount: null }
    ]
  },
  [RequestDomains.Transfers]: {
    id: 'transfers',
    types: [
      { Transfer: [] }  // empty array for "any account"
    ]
  },
  [RequestDomains.Users]: {
    id: 'users',
    types: [
      { AddUser: null },
      { EditUser: null }
    ]
  },
  [RequestDomains.ExternalCanisters]: {
    id: 'external_canisters',
    types: [
      { CreateExternalCanister: null },
      { FundExternalCanister: [] },
      { ConfigureExternalCanister: [] },
      { CallExternalCanister: [] },
      { ChangeExternalCanister: [] },
      { PruneExternalCanister: [] },
      { SnapshotExternalCanister: [] },
      { RestoreExternalCanister: [] }
    ]
  },
  [RequestDomains.AddressBook]: {
    id: 'address_book',
    types: [
      { AddAddressBookEntry: null },
      { EditAddressBookEntry: null },
      { RemoveAddressBookEntry: null }
    ]
  },
  [RequestDomains.Assets]: {
    id: 'assets',
    types: [
      { AddAsset: null },
      { EditAsset: null },
      { RemoveAsset: null }
    ]
  },
  [RequestDomains.System]: {
    id: 'system',
    types: [
      { EditPermission: null },
      { AddRequestPolicy: null },
      { EditRequestPolicy: null },
      { RemoveRequestPolicy: null },
      { SystemUpgrade: null },
      { AddUserGroup: null },
      { EditUserGroup: null },
      { RemoveUserGroup: null },
      { ManageSystemInfo: null },
      { SetDisasterRecovery: null },
      { AddNamedRule: null },
      { EditNamedRule: null },
      { RemoveNamedRule: null }
    ]
  }
};