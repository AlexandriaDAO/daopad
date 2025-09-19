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

  const BoolResult = IDL.Variant({
    'Ok': IDL.Bool,
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
    'grant_self_permissions': IDL.Func([IDL.Principal], [UserManagementResult], []),
    'verify_permissions': IDL.Func([IDL.Principal], [PermissionResult], []),
    'list_all_admins': IDL.Func([IDL.Principal], [AdminListResult], []),
    'remove_admin_role': IDL.Func([IDL.Principal, IDL.Text], [UserManagementResult], []),
    'downgrade_to_operator': IDL.Func([IDL.Principal, IDL.Text], [UserManagementResult], []),
    'verify_sole_admin': IDL.Func([IDL.Principal], [BoolResult], []),
    'get_admin_count': IDL.Func([IDL.Principal], [AdminCountResult], []),

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

  async grantSelfPermissions(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const result = await actor.grant_self_permissions(tokenCanisterId);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to grant self permissions:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyPermissions(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const result = await actor.verify_permissions(tokenCanisterId);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to verify permissions:', error);
      return { success: false, error: error.message };
    }
  }

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
}
