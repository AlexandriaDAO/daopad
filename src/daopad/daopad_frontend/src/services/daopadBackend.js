import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory as generatedIdlFactory, canisterId as generatedCanisterId } from 'declarations/daopad_backend';
import { idlFactory as orbitStationIdlFactory } from './orbitStation.did.js';

// DAOPad Backend Canister ID
const DEFAULT_BACKEND_CANISTER_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';
const DAOPAD_BACKEND_ID = generatedCanisterId ?? DEFAULT_BACKEND_CANISTER_ID;

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
// Use generated candid interface to stay in sync with the deployed backend
const idlFactory = generatedIdlFactory;

const orbitErrorMessage = (errorRecord) => {
  if (!errorRecord || typeof errorRecord !== 'object') {
    return 'Orbit Station error';
  }

  const message = Array.isArray(errorRecord.message) && errorRecord.message.length > 0
    ? errorRecord.message[0]
    : errorRecord.code;

  const detailsVector = Array.isArray(errorRecord.details) && errorRecord.details.length > 0
    ? errorRecord.details[0]
    : [];

  if (Array.isArray(detailsVector) && detailsVector.length > 0) {
    const rendered = detailsVector
      .map((entry) => {
        if (Array.isArray(entry) && entry.length === 2) {
          const [key, value] = entry;
          return `${key}: ${value}`;
        }
        if (entry && typeof entry === 'object') {
          const keys = Object.keys(entry);
          if (keys.length === 2) {
            return keys.map((k) => `${k}: ${entry[k]}`).join(', ');
          }
        }
        return null;
      })
      .filter(Boolean)
      .join('; ');

    if (rendered) {
      return `${message} (${rendered})`;
    }
  }

  return message || 'Orbit Station error';
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
      // Convert string to Principal if needed
      const principal = typeof tokenCanisterId === 'string'
        ? Principal.fromText(tokenCanisterId)
        : tokenCanisterId;
      const result = await actor.get_orbit_station_for_token(principal);
      return { success: true, data: result[0]?.toText() || null };
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

  async getUserPendingRequests(tokenCanisterId, userPrincipal) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_user_pending_requests(tokenCanisterId, userPrincipal);
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to get user pending requests:', error);
      return { success: false, error: error.message };
    }
  }

  // Request Management Methods
  async listOrbitRequests(tokenCanisterId, includeCompleted = false) {
    try {
      const actor = await this.getActor();
      const input = {
        requester_ids: [],
        approver_ids: [],
        statuses: includeCompleted
          ? []
          : [[
              { Created: null },
              { Approved: null },
              { Processing: null },
              { Scheduled: null },
            ]],
        operation_types: [],
        expiration_from_dt: [],
        expiration_to_dt: [],
        created_from_dt: [],
        created_to_dt: [],
        paginate: [{ offset: [], limit: [] }],
        sort_by: [{ CreatedAt: { Desc: null } }],
        only_approvable: false,
        with_evaluation_results: false,
        deduplication_keys: [],
        tags: [],
      };

      const result = await actor.list_orbit_requests(tokenCanisterId, input);

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: orbitErrorMessage(result.Err) };
      }
    } catch (error) {
      console.error('Failed to list orbit requests:', error);
      return { success: false, error: error.message };
    }
  }

  // ❌ REMOVED: approveOrbitRequest, rejectOrbitRequest, batchApproveRequests
  // Replaced by liquid democracy voting system

  async voteOnOrbitRequest(tokenCanisterId, requestId, vote) {
    try {
      const actor = await this.getActor();
      const result = await actor.vote_on_orbit_request(
        tokenCanisterId,
        requestId,
        vote, // boolean: true = Yes, false = No
      );
      if ('Ok' in result) {
        return { success: true };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to vote on orbit request:', error);
      return { success: false, error: error.message };
    }
  }

  async getOrbitRequestProposal(tokenCanisterId, requestId) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_orbit_request_proposal(
        tokenCanisterId,
        requestId,
      );

      // Returns Option<OrbitRequestProposal>
      return { success: true, data: result[0] || null };
    } catch (error) {
      console.error('Failed to get orbit request proposal:', error);
      return { success: false, error: error.message };
    }
  }

  async listOrbitRequestProposals(tokenCanisterId) {
    try {
      const actor = await this.getActor();
      const result = await actor.list_orbit_request_proposals(tokenCanisterId);

      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to list orbit request proposals:', error);
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

  async getAccountAssets(tokenId, accountId) {
    try {
      const actor = await this.getActor();
      const result = await actor.get_account_assets(tokenId, accountId);

      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to get account assets:', error);
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

    // Treasury Proposal Methods

    async createTreasuryTransferProposal(tokenId, transferDetails) {
        try {
            const actor = await this.getActor();

            // Convert to candid format
            const details = {
                from_account_id: transferDetails.from_account_id,
                from_asset_id: transferDetails.from_asset_id,
                to: transferDetails.to,
                amount: transferDetails.amount,
                memo: transferDetails.memo ? [transferDetails.memo] : [],
                title: transferDetails.title,
                description: transferDetails.description
            };

            const result = await actor.create_treasury_transfer_proposal(
                tokenId,
                details
            );

            if ('Ok' in result) {
                return { success: true, data: result.Ok };
            } else {
                return { success: false, error: result.Err };
            }
        } catch (error) {
            console.error('Error creating treasury transfer proposal:', error);
            return {
                success: false,
                error: error.message || 'Failed to create transfer proposal'
            };
        }
    }

    async getTreasuryProposal(tokenId) {
        try {
            const actor = await this.getActor();
            const result = await actor.get_treasury_proposal(tokenId);

            if (result && result.length > 0) {
                return { success: true, data: result[0] };
            } else {
                return { success: true, data: null };
            }
        } catch (error) {
            console.error('Error getting treasury proposal:', error);
            return { success: false, error: error.message };
        }
    }

    async voteOnTreasuryProposal(proposalId, vote) {
        try {
            const actor = await this.getActor();
            const result = await actor.vote_on_treasury_proposal(proposalId, vote);

            if ('Ok' in result) {
                return { success: true };
            } else {
                return { success: false, error: result.Err };
            }
        } catch (error) {
            console.error('Error voting on treasury proposal:', error);
            return { success: false, error: error.message };
        }
    }

    // Direct Orbit Station calls using their exact IDL factory
    async getOrbitStationId(tokenCanisterId) {
        try {
            const actor = await this.getActor();
            const result = await actor.get_orbit_station_for_token(Principal.fromText(tokenCanisterId));
            // Method returns opt principal (array in JS: [] for None, [principal] for Some)
            if (result && result.length > 0) {
                return result[0].toText();
            }
            throw new Error('No Orbit Station found for token');
        } catch (error) {
            throw new Error(`Failed to get Orbit Station ID: ${error.message}`);
        }
    }

    async createOrbitStationActor(stationId) {
        const agent = new HttpAgent({
            host: this.isDevelopment ? 'http://localhost:4943' : 'https://icp0.io',
            identity: this.identity,
        });

        if (this.isDevelopment) {
            await agent.fetchRootKey();
        }

        return Actor.createActor(orbitStationIdlFactory, {
            agent,
            canisterId: stationId,
        });
    }

    // Call Orbit Station directly using their exact types
    async listOrbitRequestsDirect(tokenCanisterId, filters = {}) {
        try {
            const stationId = await this.getOrbitStationId(tokenCanisterId);
            const orbitActor = await this.createOrbitStationActor(stationId);

            // Pass filters directly - UnifiedRequests already formats them correctly
            const result = await orbitActor.list_requests(filters);

            if ('Ok' in result) {
                return { success: true, data: result.Ok };
            } else {
                return { success: false, error: result.Err };
            }
        } catch (error) {
            console.error('Error calling Orbit Station directly:', error);
            return { success: false, error: error.message || 'Failed to fetch requests from Orbit Station' };
        }
    }

    // Check if backend is a member of the Orbit Station
    async checkBackendStatus(tokenId) {
        try {
            const actor = await this.getActor();
            const tokenPrincipal = Principal.fromText(tokenId);
            const result = await actor.check_backend_status(tokenPrincipal);

            if ('Ok' in result) {
                return {
                    success: true,
                    data: {
                        is_member: result.Ok.is_member,
                        backend_principal: result.Ok.backend_principal.toText(),
                        station_id: result.Ok.station_id.toText(),
                        instructions: result.Ok.instructions?.[0] || null,
                        error: result.Ok.error?.[0] || null
                    }
                };
            } else {
                return {
                    success: false,
                    error: result.Err || 'Failed to check backend status'
                };
            }
        } catch (error) {
            console.error('Error checking backend status:', error);
            return {
                success: false,
                error: error.message || 'Failed to check backend status'
            };
        }
    }

    // Account management methods
    async createTreasuryAccount(tokenId, accountConfig) {
        try {
            const actor = await this.getActor();

            // Build permission objects with correct encoding
            const encodePermission = (permission) => ({
                auth_scope: permission.authScope,  // Already a variant object
                users: permission.users || [],
                user_groups: permission.userGroups || []
            });

            // Build rule objects with CORRECT Quorum structure
            const encodeRule = (rule) => {
                if (!rule) return null;

                if (rule.type === 'AutoApproved') {
                    return { AutoApproved: null };
                }

                if (rule.type === 'Quorum') {
                    return {
                        Quorum: {
                            approvers: { Any: null },  // REQUIRED field!
                            min_approved: rule.minApproved
                        }
                    };
                }

                if (rule.type === 'QuorumPercentage') {
                    return {
                        QuorumPercentage: {
                            approvers: { Any: null },  // REQUIRED field!
                            min_approved: rule.minPercent
                        }
                    };
                }

                return null;
            };

            const config = {
                name: accountConfig.name,
                asset_ids: accountConfig.assetIds,
                metadata: accountConfig.metadata || [],
                read_permission: encodePermission(accountConfig.readPermission),
                configs_permission: encodePermission(accountConfig.configsPermission),
                transfer_permission: encodePermission(accountConfig.transferPermission),
                configs_request_policy: accountConfig.configsRule
                    ? [encodeRule(accountConfig.configsRule)] : [],  // Wrap in array for Option
                transfer_request_policy: accountConfig.transferRule
                    ? [encodeRule(accountConfig.transferRule)] : []  // Wrap in array for Option
            };

            const result = await actor.create_treasury_account(
                Principal.fromText(tokenId),
                config
            );

            if ('Ok' in result) {
                return {
                    success: true,
                    data: result.Ok
                };
            } else {
                return {
                    success: false,
                    error: result.Err || 'Failed to create account'
                };
            }
        } catch (error) {
            console.error('Error creating treasury account:', error);
            return {
                success: false,
                error: error.message || 'Failed to create account'
            };
        }
    }

    async getAvailableAssets(tokenId) {
        try {
            const actor = await this.getActor();
            const result = await actor.get_available_assets(Principal.fromText(tokenId));

            if ('Ok' in result) {
                return {
                    success: true,
                    data: result.Ok.assets || []
                };
            } else {
                return {
                    success: false,
                    error: result.Err?.message || result.Err?.code || 'Failed to get assets'
                };
            }
        } catch (error) {
            console.error('Error getting available assets:', error);
            return {
                success: false,
                error: error.message || 'Failed to get assets'
            };
        }
    }

    async validateAccountName(tokenId, name) {
        try {
            const actor = await this.getActor();
            const result = await actor.validate_account_name(
                Principal.fromText(tokenId),
                name
            );

            if ('Ok' in result) {
                return {
                    success: true,
                    isValid: result.Ok
                };
            } else {
                return {
                    success: false,
                    error: result.Err || 'Failed to validate name'
                };
            }
        } catch (error) {
            console.error('Error validating account name:', error);
            return {
                success: false,
                error: error.message || 'Failed to validate name'
            };
        }
    }

    async getHighVpMembers(tokenId, minVp = 100) {
        try {
            const actor = await this.getActor();
            const result = await actor.get_high_vp_members(
                Principal.fromText(tokenId),
                minVp
            );

            if ('Ok' in result) {
                return {
                    success: true,
                    data: result.Ok.map(p => p.toText())
                };
            } else {
                return {
                    success: false,
                    error: result.Err || 'Failed to get high VP members'
                };
            }
        } catch (error) {
            console.error('Error getting high VP members:', error);
            return {
                success: false,
                error: error.message || 'Failed to get high VP members'
            };
        }
    }

    static async getOrbitSystemInfo(tokenCanisterId) {
        try {
            // Create a static actor without identity (for public read-only calls)
            const agent = new HttpAgent({ host: 'https://ic0.app' });
            const actor = Actor.createActor(idlFactory, {
                agent,
                canisterId: DAOPAD_BACKEND_ID,
            });

            const result = await actor.get_orbit_system_info(
                Principal.fromText(tokenCanisterId)
            );

            if ('Ok' in result) {
                return {
                    success: true,
                    data: result.Ok
                };
            } else {
                return {
                    success: false,
                    error: result.Err || 'Failed to get system info'
                };
            }
        } catch (error) {
            console.error('Error getting orbit system info:', error);
            return {
                success: false,
                error: error.message || 'Failed to get system info'
            };
        }
    }

    async performSecurityCheck(stationId) {
        try {
            const actor = await this.getActor();
            // Convert string to Principal if needed
            const stationPrincipal = typeof stationId === 'string'
                ? Principal.fromText(stationId)
                : stationId;
            const result = await actor.perform_security_check(stationPrincipal);

            if ('Ok' in result) {
                const dashboard = result.Ok;
                return {
                    success: true,
                    data: {
                        station_id: dashboard.station_id,
                        overall_status: dashboard.overall_status,
                        last_checked: dashboard.last_checked,
                        checks: dashboard.checks.map(check => ({
                            category: check.category,
                            name: check.name,
                            status: Object.keys(check.status)[0], // Extract variant key
                            message: check.message,
                            severity: check.severity[0] ? Object.keys(check.severity[0])[0] : null,
                            details: check.details[0] || null,
                            recommendation: check.recommendation[0] || null
                        }))
                    }
                };
            } else {
                return {
                    success: false,
                    message: result.Err
                };
            }
        } catch (error) {
            console.error('Security check error:', error);
            return {
                success: false,
                message: 'Failed to perform security check'
            };
        }
    }

    // Permissions Management Methods

    async listPermissions(tokenCanisterId, resources = null) {
        try {
            const actor = await this.getActor();
            const result = await actor.list_permissions(
                Principal.fromText(tokenCanisterId),
                resources === null ? [] : [resources]  // Wrap in Option properly
            );

            if ('Ok' in result) {
                return { success: true, data: result.Ok };
            } else {
                return {
                    success: false,
                    error: orbitErrorMessage(result.Err)
                };
            }
        } catch (error) {
            console.error('Error listing permissions:', error);
            return { success: false, error: error.message };
        }
    }

    async getPermission(tokenCanisterId, resource) {
        try {
            const actor = await this.getActor();
            const result = await actor.get_permission(
                Principal.fromText(tokenCanisterId),
                resource
            );

            if ('Ok' in result) {
                return { success: true, data: result.Ok };
            } else {
                return {
                    success: false,
                    error: orbitErrorMessage(result.Err)
                };
            }
        } catch (error) {
            console.error('Error getting permission:', error);
            return { success: false, error: error.message };
        }
    }

    async requestPermissionChange(tokenCanisterId, resource, authScope, users, userGroups) {
        try {
            const actor = await this.getActor();
            // Backend expects Option types, frontend must wrap
            const result = await actor.request_permission_change(
                Principal.fromText(tokenCanisterId),
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
                    error: orbitErrorMessage(result.Err)
                };
            }
        } catch (error) {
            console.error('Error requesting permission change:', error);
            return { success: false, error: error.message };
        }
    }

    async listUserGroups(tokenCanisterId, paginate = null) {
        try {
            const actor = await this.getActor();
            const result = await actor.list_user_groups(
                Principal.fromText(tokenCanisterId),
                paginate
            );

            if ('Ok' in result) {
                return { success: true, data: result.Ok };
            } else {
                return {
                    success: false,
                    error: orbitErrorMessage(result.Err)
                };
            }
        } catch (error) {
            console.error('Error listing user groups:', error);
            return { success: false, error: error.message };
        }
    }

}
