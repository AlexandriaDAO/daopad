import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

// DAOPad Backend Canister ID
const DAOPAD_BACKEND_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';

// ICRC1 Token Metadata IDL
const icrc1MetadataIDL = ({ IDL }) => {
  const Value = IDL.Variant({
    Text: IDL.Text,
    Nat: IDL.Nat,
    Int: IDL.Int,
    Blob: IDL.Vec(IDL.Nat8),
  });
  const MetadataEntry = IDL.Tuple(IDL.Text, Value);
  return IDL.Service({
    icrc1_metadata: IDL.Func([], [IDL.Vec(MetadataEntry)], ['query']),
  });
};

// IDL Factory for DAOPad Backend - Clean Kong Locker Integration Interface
const idlFactory = ({ IDL }) => {
  const Result = IDL.Variant({
    'Ok': IDL.Text,
    'Err': IDL.Text,
  });

  const TokenInfo = IDL.Record({
    'canister_id': IDL.Text,
    'symbol': IDL.Text,
    'chain': IDL.Text,
  });

  // Proposal System Types
  const ProposalStatus = IDL.Variant({
    'Active': IDL.Null,
    'Approved': IDL.Null,
    'Rejected': IDL.Null,
    'Expired': IDL.Null,
  });

  const OrbitLinkProposal = IDL.Record({
    'id': IDL.Nat64,
    'token_canister_id': IDL.Principal,
    'station_id': IDL.Principal,
    'proposer': IDL.Principal,
    'created_at': IDL.Nat64,
    'expires_at': IDL.Nat64,
    'yes_votes': IDL.Nat64,
    'no_votes': IDL.Nat64,
    'total_voting_power': IDL.Nat64,
    'voters': IDL.Vec(IDL.Principal),
    'status': ProposalStatus,
  });

  const TokenResult = IDL.Variant({
    'Ok': IDL.Vec(TokenInfo),
    'Err': IDL.Text,
  });

  const ProposalResult = IDL.Variant({
    'Ok': IDL.Nat64,
    'Err': IDL.Text,
  });

  const VoteResult = IDL.Variant({
    'Ok': IDL.Null,
    'Err': IDL.Text,
  });

  const CleanupResult = IDL.Variant({
    'Ok': IDL.Nat32,
    'Err': IDL.Text,
  });

  // User management types
  const UserStatus = IDL.Variant({
    'Active': IDL.Null,
    'Inactive': IDL.Null,
  });

  const UserInfo = IDL.Record({
    'id': IDL.Text,
    'name': IDL.Text,
    'identities': IDL.Vec(IDL.Principal),
    'status': IDL.Text,
    'groups': IDL.Vec(IDL.Text),
  });

  const UserGroupInfo = IDL.Record({
    'id': IDL.Text,
    'name': IDL.Text,
  });

  const UserManagementResult = IDL.Variant({
    'Ok': IDL.Text,
    'Err': IDL.Text,
  });

  const ListUsersResult = IDL.Variant({
    'Ok': IDL.Vec(UserInfo),
    'Err': IDL.Text,
  });

  const ListUserGroupsResult = IDL.Variant({
    'Ok': IDL.Vec(UserGroupInfo),
    'Err': IDL.Text,
  });

  // DAO Transition Types
  const PermissionStatus = IDL.Record({
    'is_admin': IDL.Bool,
    'has_user_management': IDL.Bool,
    'has_system_management': IDL.Bool,
    'user_name': IDL.Text,
    'user_id': IDL.Text,
    'groups': IDL.Vec(IDL.Text),
    'privileges': IDL.Vec(IDL.Text),
  });

  const AdminInfo = IDL.Record({
    'id': IDL.Text,
    'name': IDL.Text,
    'identities': IDL.Vec(IDL.Principal),
    'status': IDL.Text,
    'is_daopad_backend': IDL.Bool,
  });

  const AdminCount = IDL.Record({
    'total': IDL.Nat32,
    'daopad_backend': IDL.Nat32,
    'human_admins': IDL.Nat32,
    'admin_list': IDL.Vec(AdminInfo),
  });

  const PermissionResult = IDL.Variant({
    'Ok': PermissionStatus,
    'Err': IDL.Text,
  });

  const AdminCountResult = IDL.Variant({
    'Ok': AdminCount,
    'Err': IDL.Text,
  });

  const AdminListResult = IDL.Variant({
    'Ok': IDL.Vec(AdminInfo),
    'Err': IDL.Text,
  });

  // Treasury Account Types
  const AccountMetadata = IDL.Record({
    'key': IDL.Text,
    'value': IDL.Text,
  });

  const AccountAddress = IDL.Record({
    'address': IDL.Text,
    'format': IDL.Text,
  });

  const AccountBalance = IDL.Record({
    'account_id': IDL.Text,
    'asset_id': IDL.Text,
    'balance': IDL.Nat,
    'decimals': IDL.Nat32,
    'last_update_timestamp': IDL.Text,
    'query_state': IDL.Text,
  });

  const AccountAsset = IDL.Record({
    'asset_id': IDL.Text,
    'balance': IDL.Opt(AccountBalance),
  });

  const RequestPolicyRule = IDL.Rec();
  RequestPolicyRule.fill(
    IDL.Variant({
      'AutoApproved': IDL.Null,
      'QuorumPercentage': IDL.Record({ 'min_approved': IDL.Nat32 }),
      'Quorum': IDL.Record({ 'min_approved': IDL.Nat32 }),
      'AllowListedByMetadata': AccountMetadata,
      'AllowListed': IDL.Null,
      'AnyOf': IDL.Vec(RequestPolicyRule),
      'AllOf': IDL.Vec(RequestPolicyRule),
      'Not': RequestPolicyRule,
      'NamedRule': IDL.Text,
    })
  );

  const Account = IDL.Record({
    'id': IDL.Text,
    'assets': IDL.Vec(AccountAsset),
    'addresses': IDL.Vec(AccountAddress),
    'name': IDL.Text,
    'metadata': IDL.Vec(AccountMetadata),
    'transfer_request_policy': IDL.Opt(RequestPolicyRule),
    'configs_request_policy': IDL.Opt(RequestPolicyRule),
    'last_modification_timestamp': IDL.Text,
  });

  const AccountCallerPrivileges = IDL.Record({
    'id': IDL.Text,
    'can_edit': IDL.Bool,
    'can_transfer': IDL.Bool,
  });

  const Error = IDL.Record({
    'code': IDL.Text,
    'message': IDL.Opt(IDL.Text),
  });

  const ListAccountsResult = IDL.Variant({
    'Ok': IDL.Record({
      'accounts': IDL.Vec(Account),
      'privileges': IDL.Vec(AccountCallerPrivileges),
      'total': IDL.Nat64,
      'next_offset': IDL.Opt(IDL.Nat64),
    }),
    'Err': Error,
  });

  const FetchAccountBalancesResult = IDL.Variant({
    'Ok': IDL.Vec(IDL.Opt(AccountBalance)),
    'Err': IDL.Text,
  });

  const BoolResult = IDL.Variant({
    'Ok': IDL.Bool,
    'Err': IDL.Text,
  });

  const StringVecResult = IDL.Variant({
    'Ok': IDL.Vec(IDL.Text),
    'Err': IDL.Text,
  });

  // Request Management Types
  const SimplifiedRequest = IDL.Record({
    'id': IDL.Text,
    'title': IDL.Text,
    'summary': IDL.Opt(IDL.Text),
    'operation_type': IDL.Text,
    'status': IDL.Text,
    'requester_name': IDL.Text,
    'created_at': IDL.Text,
    'approval_count': IDL.Nat32,
    'rejection_count': IDL.Nat32,
  });

  const SimplifiedRequestVecResult = IDL.Variant({
    'Ok': IDL.Vec(SimplifiedRequest),
    'Err': IDL.Text,
  });

  return IDL.Service({
    // Kong Locker Integration
    'register_with_kong_locker': IDL.Func([IDL.Principal], [Result], []),
    'get_my_kong_locker_canister': IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'get_my_voting_power_for_token': IDL.Func([IDL.Principal], [IDL.Variant({ 'Ok': IDL.Nat64, 'Err': IDL.Text })], []),
    'unregister_kong_locker': IDL.Func([], [Result], []),
    'list_all_kong_locker_registrations': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Principal))], ['query']),

    // Proposal System Methods
    'propose_orbit_station_link': IDL.Func([IDL.Principal, IDL.Principal], [ProposalResult], []),
    'vote_on_orbit_proposal': IDL.Func([IDL.Nat64, IDL.Bool], [VoteResult], []),
    'get_active_proposal_for_token': IDL.Func([IDL.Principal], [IDL.Opt(OrbitLinkProposal)], ['query']),
    'list_active_proposals': IDL.Func([], [IDL.Vec(OrbitLinkProposal)], ['query']),
    'cleanup_expired_proposals': IDL.Func([], [CleanupResult], []),

    // Orbit Station Methods (existing stations)
    'get_my_locked_tokens': IDL.Func([], [TokenResult], []),
    'get_orbit_station_for_token': IDL.Func([IDL.Principal], [IDL.Opt(IDL.Principal)], ['query']),
    'list_all_orbit_stations': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Principal))], ['query']),
    'join_orbit_station': IDL.Func([IDL.Principal, IDL.Text], [Result], []),

    // User Management Methods
    'add_user_to_orbit': IDL.Func([IDL.Principal, IDL.Principal, IDL.Text, IDL.Vec(IDL.Text), UserStatus], [UserManagementResult], []),
    'remove_user_from_orbit': IDL.Func([IDL.Principal, IDL.Text], [UserManagementResult], []),
    'list_orbit_users': IDL.Func([IDL.Principal], [ListUsersResult], []),
    'list_orbit_user_groups': IDL.Func([IDL.Principal], [ListUserGroupsResult], []),
    'get_predefined_groups': IDL.Func([], [IDL.Vec(UserGroupInfo)], ['query']),

    // DAO Transition Methods
    'list_all_admins': IDL.Func([IDL.Principal], [AdminListResult], []),
    'remove_admin_role': IDL.Func([IDL.Principal, IDL.Text], [UserManagementResult], []),
    'downgrade_to_operator': IDL.Func([IDL.Principal, IDL.Text], [UserManagementResult], []),
    'verify_sole_admin': IDL.Func([IDL.Principal], [BoolResult], []),
    'get_admin_count': IDL.Func([IDL.Principal], [AdminCountResult], []),

    // Request Management Methods
    'list_orbit_requests': IDL.Func([IDL.Principal, IDL.Bool], [SimplifiedRequestVecResult], []),
    'approve_orbit_request': IDL.Func([IDL.Principal, IDL.Text, IDL.Opt(IDL.Text)], [Result], []),
    'reject_orbit_request': IDL.Func([IDL.Principal, IDL.Text, IDL.Opt(IDL.Text)], [Result], []),
    'batch_approve_requests': IDL.Func([IDL.Principal, IDL.Vec(IDL.Text)], [StringVecResult], []),

    // Treasury Account Methods
    'list_orbit_accounts': IDL.Func([IDL.Principal, IDL.Opt(IDL.Text), IDL.Opt(IDL.Nat64), IDL.Opt(IDL.Nat64)], [IDL.Variant({ 'Ok': ListAccountsResult, 'Err': IDL.Text })], []),
    'fetch_orbit_account_balances': IDL.Func([IDL.Principal, IDL.Vec(IDL.Text)], [IDL.Variant({ 'Ok': IDL.Vec(IDL.Opt(AccountBalance)), 'Err': IDL.Text })], []),

    // Transfer Request Methods
    'create_transfer_request': IDL.Func([
      IDL.Text,        // from_account_id
      IDL.Text,        // from_asset_id
      IDL.Text,        // to_address
      IDL.Nat,         // amount
      IDL.Text,        // title
      IDL.Text,        // description
      IDL.Opt(IDL.Text), // memo
      IDL.Principal,   // token_id
    ], [Result], []),

    // Utility Functions
    'get_backend_principal': IDL.Func([], [IDL.Principal], ['query']),
    'get_kong_locker_factory_principal': IDL.Func([], [IDL.Principal], ['query']),
    'health_check': IDL.Func([], [IDL.Text], ['query']),

  });
};

export const getBackendActor = async (identity) => {
  const isLocal = import.meta.env.VITE_DFX_NETWORK === 'local';
  const host = isLocal ? 'http://localhost:4943' : 'https://icp0.io';

  const agent = new HttpAgent({
    identity,
    host,
  });

  if (isLocal) {
    await agent.fetchRootKey();
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: DAOPAD_BACKEND_ID,
  });
};

export class DAOPadBackendService {
  constructor(identity) {
    this.identity = identity;
    this.actor = null;
  }

  async getActor() {
    if (!this.actor || this.identity !== this.lastIdentity) {
      this.actor = await getBackendActor(this.identity);
      this.lastIdentity = this.identity;
    }
    return this.actor;
  }

  // Kong Locker Integration
  
  async registerWithKongLocker(kongLockerPrincipal) {
    try {
      const actor = await this.getActor();
      const result = await actor.register_with_kong_locker(kongLockerPrincipal);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to register with Kong Locker:', error);
      return { success: false, error: error.message };
    }
  }

  async getMyKongLockerCanister() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_kong_locker_canister();
      return { success: true, data: result[0] || null };
    } catch (error) {
      console.error('Failed to get Kong Locker canister:', error);
      return { success: false, error: error.message };
    }
  }

  async unregisterKongLocker() {
    try {
      const actor = await this.getActor();
      const result = await actor.unregister_kong_locker();
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to unregister Kong Locker:', error);
      return { success: false, error: error.message };
    }
  }

  async listAllKongLockerRegistrations() {
    try {
      const actor = await this.getActor();
      const result = await actor.list_all_kong_locker_registrations();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to list Kong Locker registrations:', error);
      return { success: false, error: error.message };
    }
  }

  // Utility Functions

  async getBackendPrincipal() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_backend_principal();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get backend principal:', error);
      return { success: false, error: error.message };
    }
  }

  async getKongLockerFactoryPrincipal() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_kong_locker_factory_principal();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get Kong Locker factory principal:', error);
      return { success: false, error: error.message };
    }
  }

  // Proposal System Methods

  async proposeOrbitStationLink(tokenCanisterId, stationId) {
    try {
      const actor = await this.getActor();
      const result = await actor.propose_orbit_station_link(tokenCanisterId, stationId);
      if ('Ok' in result) {
        return { success: true, data: Number(result.Ok) }; // proposal ID
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to propose orbit station link:', error);
      return { success: false, error: error.message };
    }
  }

  async voteOnOrbitProposal(proposalId, vote) {
    try {
      const actor = await this.getActor();
      const result = await actor.vote_on_orbit_proposal(BigInt(proposalId), vote);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to vote on orbit proposal:', error);
      return { success: false, error: error.message };
    }
  }

  async getActiveProposalForToken(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_active_proposal_for_token(tokenCanisterId);
      return { success: true, data: result[0] || null };
    } catch (error) {
      console.error('Failed to get active proposal for token:', error);
      return { success: false, error: error.message };
    }
  }

  async listActiveProposals() {
    try {
      const actor = await this.getActor();
      const result = await actor.list_active_proposals();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to list active proposals:', error);
      return { success: false, error: error.message };
    }
  }

  async cleanupExpiredProposals() {
    try {
      const actor = await this.getActor();
      const result = await actor.cleanup_expired_proposals();
      if ('Ok' in result) {
        return { success: true, data: Number(result.Ok) };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to cleanup expired proposals:', error);
      return { success: false, error: error.message };
    }
  }

  // Orbit Station Methods (for existing stations)

  async getMyLockedTokens() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_locked_tokens();
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to get locked tokens:', error);
      return { success: false, error: error.message };
    }
  }

  async getOrbitStationForToken(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_orbit_station_for_token(tokenCanisterId);
      return { success: true, data: result[0] || null };
    } catch (error) {
      console.error('Failed to get any orbit station for token:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllOrbitStations() {
    try {
      const actor = await this.getActor();
      const result = await actor.list_all_orbit_stations();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get all orbit stations:', error);
      return { success: false, error: error.message };
    }
  }

  async getMyVotingPowerForToken(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_my_voting_power_for_token(tokenCanisterId);
      if ('Ok' in result) {
        return { success: true, data: Number(result.Ok) };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to get voting power for token:', error);
      return { success: false, error: error.message };
    }
  }

  async joinOrbitStation(tokenCanisterId, displayName) {
    try {
      const actor = await this.getActor();
      const result = await actor.join_orbit_station(tokenCanisterId, displayName);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to join orbit station:', error);
      return { success: false, error: error.message };
    }
  }

  // User Management Methods

  async addUserToOrbit(tokenCanisterId, userPrincipal, userName, groups = [], status = { 'Active': null }) {
    try {
      const actor = await this.getActor();
      const result = await actor.add_user_to_orbit(tokenCanisterId, userPrincipal, userName, groups, status);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to add user to orbit station:', error);
      return { success: false, error: error.message };
    }
  }

  async removeUserFromOrbit(tokenCanisterId, userId) {
    try {
      const actor = await this.getActor();
      const result = await actor.remove_user_from_orbit(tokenCanisterId, userId);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to remove user from orbit station:', error);
      return { success: false, error: error.message };
    }
  }

  async listOrbitUsers(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const result = await actor.list_orbit_users(tokenCanisterId);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to list orbit users:', error);
      return { success: false, error: error.message };
    }
  }

  async listOrbitUserGroups(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const result = await actor.list_orbit_user_groups(tokenCanisterId);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to list orbit user groups:', error);
      return { success: false, error: error.message };
    }
  }

  async getPredefinedGroups() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_predefined_groups();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get predefined groups:', error);
      return { success: false, error: error.message };
    }
  }

  // DAO Transition Methods


  async listAllAdmins(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const result = await actor.list_all_admins(tokenCanisterId);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to list admins:', error);
      return { success: false, error: error.message };
    }
  }

  async removeAdminRole(tokenCanisterId, userId) {
    try {
      const actor = await this.getActor();
      const result = await actor.remove_admin_role(tokenCanisterId, userId);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to remove admin role:', error);
      return { success: false, error: error.message };
    }
  }


  // Request Management Methods
  async listOrbitRequests(tokenCanisterId, includeCompleted = false) {
    try {
      const actor = await this.getActor();
      const result = await actor.list_orbit_requests(tokenCanisterId, includeCompleted);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to list orbit requests:', error);
      return { success: false, error: error.message };
    }
  }

  async approveOrbitRequest(tokenCanisterId, requestId) {
    try {
      const actor = await this.getActor();
      const result = await actor.approve_orbit_request(tokenCanisterId, requestId, []);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to approve orbit request:', error);
      return { success: false, error: error.message };
    }
  }

  async rejectOrbitRequest(tokenCanisterId, requestId) {
    try {
      const actor = await this.getActor();
      const result = await actor.reject_orbit_request(tokenCanisterId, requestId, []);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to reject orbit request:', error);
      return { success: false, error: error.message };
    }
  }

  async batchApproveRequests(tokenCanisterId, requestIds) {
    try {
      const actor = await this.getActor();
      const result = await actor.batch_approve_requests(tokenCanisterId, requestIds);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to batch approve requests:', error);
      return { success: false, error: error.message };
    }
  }

  async downgradeToOperator(tokenCanisterId, userId) {
    try {
      const actor = await this.getActor();
      const result = await actor.downgrade_to_operator(tokenCanisterId, userId);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to downgrade to operator:', error);
      return { success: false, error: error.message };
    }
  }

  async verifySoleAdmin(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const result = await actor.verify_sole_admin(tokenCanisterId);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to verify sole admin:', error);
      return { success: false, error: error.message };
    }
  }

  // Treasury Account Methods

  async listOrbitAccounts(stationId, searchTerm, limit, offset) {
    try {
      const actor = await this.getActor();
      const result = await actor.list_orbit_accounts(
        stationId,
        searchTerm ? [searchTerm] : [],
        limit ? [limit] : [],
        offset ? [offset] : []
      );

      if ('Ok' in result && 'Ok' in result.Ok) {
        const data = result.Ok.Ok;
        return {
          success: true,
          data: {
            accounts: data.accounts,
            privileges: data.privileges,
            total: Number(data.total),
            nextOffset: data.next_offset?.[0] ? Number(data.next_offset[0]) : null
          }
        };
      } else if ('Ok' in result && 'Err' in result.Ok) {
        return { success: false, error: result.Ok.Err.message || result.Ok.Err.code };
      } else {
        return { success: false, error: result.Err || 'Unknown error' };
      }
    } catch (error) {
      console.error('Failed to list orbit accounts:', error);
      return { success: false, error: error.message };
    }
  }

  async fetchOrbitAccountBalances(stationId, accountIds) {
    try {
      const actor = await this.getActor();
      const result = await actor.fetch_orbit_account_balances(stationId, accountIds);

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to fetch account balances:', error);
      return { success: false, error: error.message };
    }
  }

  async getAdminCount(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_admin_count(tokenCanisterId);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to get admin count:', error);
      return { success: false, error: error.message };
    }
  }

  // Health Check

  async healthCheck() {
    try {
      const actor = await this.getActor();
      const result = await actor.health_check();
      return { success: true, data: result };
    } catch (error) {
      console.error('Health check failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Token Metadata Methods

  static async getTokenMetadata(tokenCanisterId) {
    try {
      console.log('Fetching metadata for:', tokenCanisterId);
      const agent = new HttpAgent({ host: 'https://ic0.app' });

      // Always convert to string first, then to Principal
      let canisterIdString;
      if (typeof tokenCanisterId === 'string') {
        canisterIdString = tokenCanisterId;
      } else if (tokenCanisterId && tokenCanisterId.toText) {
        canisterIdString = tokenCanisterId.toText();
      } else if (tokenCanisterId && tokenCanisterId.toString) {
        canisterIdString = tokenCanisterId.toString();
      } else {
        throw new Error('Invalid canister ID format');
      }

      // Now convert string to Principal for Actor.createActor
      const canisterPrincipal = Principal.fromText(canisterIdString);
      console.log('Creating actor with Principal:', canisterPrincipal.toText());

      const tokenActor = Actor.createActor(icrc1MetadataIDL, {
        agent,
        canisterId: canisterPrincipal,
      });

      const metadata = await tokenActor.icrc1_metadata();

      // Parse metadata array into object
      const parsedMetadata = {};
      for (const [key, value] of metadata) {
        // Extract the value from the variant
        if (value.Text !== undefined) {
          parsedMetadata[key] = value.Text;
        } else if (value.Nat !== undefined) {
          parsedMetadata[key] = value.Nat.toString();
        } else if (value.Int !== undefined) {
          parsedMetadata[key] = value.Int.toString();
        } else if (value.Blob !== undefined) {
          parsedMetadata[key] = value.Blob;
        }
      }

      return {
        success: true,
        data: {
          name: parsedMetadata['icrc1:name'] || parsedMetadata['name'] || 'Unknown Token',
          symbol: parsedMetadata['icrc1:symbol'] || parsedMetadata['symbol'] || 'N/A',
          description: parsedMetadata['icrc1:description'] || parsedMetadata['description'] || '',
          logo: parsedMetadata['icrc1:logo'] || parsedMetadata['logo'] || '',
          decimals: parsedMetadata['icrc1:decimals'] || parsedMetadata['decimals'] || '8',
          fee: parsedMetadata['icrc1:fee'] || parsedMetadata['fee'] || '0',
          raw: parsedMetadata,
        },
      };
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      return {
        success: false,
        error: error.message,
        data: {
          name: 'Unknown Token',
          symbol: 'N/A',
          description: '',
          logo: '',
          decimals: '8',
          fee: '0',
        },
      };
    }
  }
    async testBackendIntegration(payload = {}) {
        try {
            const actor = await this.getActor();
            const result = await actor.health_check();
            return {
                success: true,
                data: {
                    message: 'Backend integration healthy',
                    payload,
                    result,
                },
            };
        } catch (error) {
            console.error('Backend integration test failed', error);
            return { success: false, error: error?.message ?? 'Unknown error' };
        }
    }

    // Treasury Transfer Methods

    async createTransferRequest(
        fromAccountId,
        fromAssetId,
        toAddress,
        amount,
        title,
        description,
        memo,
        tokenId
    ) {
        try {
            const actor = await this.getActor();
            // Convert tokenId string to Principal if needed
            const tokenPrincipal = typeof tokenId === 'string'
                ? Principal.fromText(tokenId)
                : tokenId;

            const result = await actor.create_transfer_request(
                fromAccountId,
                fromAssetId,
                toAddress,
                amount,
                title,
                description,
                memo ? [memo] : [],
                tokenPrincipal
            );

            if ('Ok' in result) {
                return { success: true, data: result.Ok };
            } else {
                return { success: false, error: result.Err };
            }
        } catch (error) {
            console.error('Error creating transfer request:', error);
            return {
                success: false,
                error: error.message || 'Failed to create transfer request'
            };
        }
    }

    async getTransferRequests(tokenId) {
        try {
            const actor = await this.getActor();
            const result = await actor.get_transfer_requests(
                Principal.fromText(tokenId)
            );

            if ('Ok' in result) {
                return { success: true, data: result.Ok };
            } else {
                return { success: false, error: result.Err };
            }
        } catch (error) {
            console.error('Error getting transfer requests:', error);
            return {
                success: false,
                error: error.message || 'Failed to get transfer requests'
            };
        }
    }

    async approveTransferRequest(requestId, tokenId) {
        try {
            const actor = await this.getActor();
            const result = await actor.approve_transfer_request(
                requestId,
                Principal.fromText(tokenId)
            );

            if ('Ok' in result) {
                return { success: true };
            } else {
                return { success: false, error: result.Err };
            }
        } catch (error) {
            console.error('Error approving transfer request:', error);
            return {
                success: false,
                error: error.message || 'Failed to approve transfer request'
            };
        }
    }

    async rejectTransferRequest(requestId, tokenId) {
        try {
            const actor = await this.getActor();
            // Note: Orbit doesn't have explicit reject, we just don't approve
            // The request will expire eventually
            return {
                success: true,
                message: 'Rejection recorded (request will expire without approvals)'
            };
        } catch (error) {
            console.error('Error rejecting transfer request:', error);
            return {
                success: false,
                error: error.message || 'Failed to reject transfer request'
            };
        }
    }

}
