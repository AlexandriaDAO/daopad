import { Actor, ActorSubclass, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { IDL } from '@dfinity/candid';

// Admin canister ID
const ADMIN_CANISTER_ID = 'odkrm-viaaa-aaaap-qp2oq-cai';

// Define the candid interface inline
const idlFactory: IDL.InterfaceFactory = ({ IDL }) => {
  const OrbitOperationType = IDL.Variant({
    'RemoveAsset': IDL.Null,
    'AddUserGroup': IDL.Null,
    'EditPermission': IDL.Null,
    'SnapshotExternalCanister': IDL.Null,
    'PruneExternalCanister': IDL.Null,
    'EditNamedRule': IDL.Null,
    'ConfigureExternalCanister': IDL.Null,
    'ChangeExternalCanister': IDL.Null,
    'MonitorExternalCanister': IDL.Null,
    'AddUser': IDL.Null,
    'EditAsset': IDL.Null,
    'EditUserGroup': IDL.Null,
    'SetDisasterRecovery': IDL.Null,
    'EditRequestPolicy': IDL.Null,
    'RemoveRequestPolicy': IDL.Null,
    'AddAsset': IDL.Null,
    'SystemUpgrade': IDL.Null,
    'RemoveAddressBookEntry': IDL.Null,
    'SystemRestore': IDL.Null,
    'CreateExternalCanister': IDL.Null,
    'EditAddressBookEntry': IDL.Null,
    'FundExternalCanister': IDL.Null,
    'EditUser': IDL.Null,
    'ManageSystemInfo': IDL.Null,
    'Transfer': IDL.Null,
    'EditAccount': IDL.Null,
    'AddAddressBookEntry': IDL.Null,
    'RemoveUser': IDL.Null,
    'Other': IDL.Text,
    'AddRequestPolicy': IDL.Null,
    'RemoveNamedRule': IDL.Null,
    'RemoveUserGroup': IDL.Null,
    'CallExternalCanister': IDL.Null,
    'AddNamedRule': IDL.Null,
    'RestoreExternalCanister': IDL.Null,
    'AddAccount': IDL.Null,
  });

  const ProposalError = IDL.Variant({
    'AlreadyVoted': IDL.Nat64,
    'InvalidTransferDetails': IDL.Text,
    'NotActive': IDL.Null,
    'NotFound': IDL.Nat64,
    'Custom': IDL.Text,
    'NoStationLinked': IDL.Principal,
    'IcCallFailed': IDL.Record({ 'code': IDL.Int32, 'message': IDL.Text }),
    'OrbitError': IDL.Record({
      'code': IDL.Text,
      'message': IDL.Text,
      'details': IDL.Opt(IDL.Text),
    }),
    'ActiveProposalExists': IDL.Null,
    'InsufficientVotingPowerToPropose': IDL.Record({
      'required': IDL.Nat64,
      'current': IDL.Nat64,
    }),
    'ZeroVotingPower': IDL.Null,
    'NoVotingPower': IDL.Null,
    'Expired': IDL.Null,
    'AuthRequired': IDL.Null,
  });

  const ProposalStatus = IDL.Variant({
    'Active': IDL.Null,
    'Rejected': IDL.Null,
    'Executed': IDL.Null,
    'Expired': IDL.Null,
  });

  const TransferDetails = IDL.Record({
    'to': IDL.Text,
    'title': IDL.Text,
    'from_account_id': IDL.Text,
    'memo': IDL.Opt(IDL.Text),
    'description': IDL.Text,
    'amount': IDL.Nat,
    'from_asset_id': IDL.Text,
  });

  const UnifiedProposal = IDL.Record({
    'id': IDL.Nat64,
    'status': ProposalStatus,
    'yes_votes': IDL.Nat64,
    'operation_type': OrbitOperationType,
    'created_at': IDL.Nat64,
    'token_canister_id': IDL.Principal,
    'orbit_request_id': IDL.Text,
    'proposer': IDL.Principal,
    'voter_count': IDL.Nat32,
    'total_voting_power': IDL.Nat64,
    'no_votes': IDL.Nat64,
    'expires_at': IDL.Nat64,
    'transfer_details': IDL.Opt(TransferDetails),
  });

  const VoteChoice = IDL.Variant({
    'No': IDL.Null,
    'Yes': IDL.Null,
  });

  const Result = IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok': IDL.Nat64, 'Err': ProposalError });
  const Result_2 = IDL.Variant({ 'Ok': IDL.Null, 'Err': IDL.Text });
  const Result_3 = IDL.Variant({ 'Ok': IDL.Null, 'Err': ProposalError });

  return IDL.Service({
    'create_proposal': IDL.Func([IDL.Principal, IDL.Text, IDL.Text], [Result], []),
    'ensure_proposal_for_request': IDL.Func([IDL.Principal, IDL.Text, IDL.Text], [Result_1], []),
    'get_kong_locker': IDL.Func([IDL.Principal], [IDL.Opt(IDL.Principal)], ['query']),
    'get_orbit_station': IDL.Func([IDL.Principal], [IDL.Opt(IDL.Principal)], ['query']),
    'get_proposal': IDL.Func([IDL.Principal, IDL.Text], [IDL.Opt(UnifiedProposal)], ['query']),
    'get_user_vote': IDL.Func([IDL.Principal, IDL.Principal, IDL.Text], [IDL.Opt(VoteChoice)], ['query']),
    'has_user_voted': IDL.Func([IDL.Principal, IDL.Principal, IDL.Text], [IDL.Bool], ['query']),
    'list_unified_proposals': IDL.Func([IDL.Principal], [IDL.Vec(UnifiedProposal)], ['query']),
    'register_kong_locker': IDL.Func([IDL.Principal, IDL.Principal], [Result_2], []),
    'register_orbit_station': IDL.Func([IDL.Principal, IDL.Principal], [Result_2], []),
    'vote_on_proposal': IDL.Func([IDL.Principal, IDL.Text, IDL.Bool], [Result_3], []),
  });
};

interface AdminActor {
  vote_on_proposal: (tokenId: Principal, requestId: string, vote: boolean) => Promise<any>;
  get_proposal: (tokenId: Principal, requestId: string) => Promise<any>;
  has_user_voted: (userId: Principal, tokenId: Principal, requestId: string) => Promise<boolean>;
  ensure_proposal_for_request: (tokenId: Principal, requestId: string, operationType: string) => Promise<any>;
}

export class AdminService {
  private actor: ActorSubclass<AdminActor> | null = null;
  private identity: any;

  constructor(identity: any) {
    this.identity = identity;
  }

  async getActor(): Promise<ActorSubclass<AdminActor>> {
    if (!this.actor) {
      // Create agent with identity
      const agent = new HttpAgent({
        identity: this.identity,
        host: 'https://ic0.app',
      });

      // In development, fetch root key
      if (process.env.NODE_ENV !== 'production') {
        await agent.fetchRootKey().catch(err => {
          console.warn('Unable to fetch root key. Check if using local replica:', err);
        });
      }

      // Create actor
      this.actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: Principal.fromText(ADMIN_CANISTER_ID),
      });
    }
    return this.actor;
  }

  async voteOnRequest(tokenId: string, requestId: string, vote: boolean) {
    const actor = await this.getActor();
    const tokenPrincipal = Principal.fromText(tokenId);

    console.log('[AdminService] Voting on request:', { tokenId, requestId, vote });

    // Call admin's vote_on_proposal (which handles Orbit request voting)
    const result = await actor.vote_on_proposal(
      tokenPrincipal,
      requestId,
      vote
    );

    console.log('[AdminService] Vote result:', result);

    if ('Err' in result) {
      throw new Error(JSON.stringify(result.Err));
    }
    return result.Ok;
  }

  async getVoteStatus(tokenId: string, requestId: string) {
    const actor = await this.getActor();
    const tokenPrincipal = Principal.fromText(tokenId);

    console.log('[AdminService] Getting vote status:', { tokenId, requestId });

    // Get proposal from admin (which tracks votes)
    const proposal = await actor.get_proposal(tokenPrincipal, requestId);

    console.log('[AdminService] Vote status:', proposal);

    if (proposal && proposal.length > 0) {
      return {
        yes_votes: Number(proposal[0].yes_votes),
        no_votes: Number(proposal[0].no_votes),
        total_voting_power: Number(proposal[0].total_voting_power),
        status: proposal[0].status
      };
    }

    return null;
  }

  async hasUserVoted(userId: string, tokenId: string, requestId: string) {
    const actor = await this.getActor();
    const userPrincipal = Principal.fromText(userId);
    const tokenPrincipal = Principal.fromText(tokenId);

    console.log('[AdminService] Checking if user voted:', { userId, tokenId, requestId });

    const result = await actor.has_user_voted(userPrincipal, tokenPrincipal, requestId);

    console.log('[AdminService] Has voted:', result);

    return result;
  }

  async ensureProposal(tokenId: string, requestId: string, operationType: string, kongLockerPrincipal?: string) {
    const actor = await this.getActor();
    const tokenPrincipal = Principal.fromText(tokenId);

    console.log('[AdminService] Ensuring proposal:', { tokenId, requestId, operationType, kongLockerPrincipal });

    // CRITICAL: Register Kong Locker if provided (needed for voting power calculation)
    if (kongLockerPrincipal && this.identity) {
      try {
        const userPrincipal = this.identity.getPrincipal();
        const kongLockerPrinc = Principal.fromText(kongLockerPrincipal);

        console.log('[AdminService] Registering Kong Locker:', { userPrincipal: userPrincipal.toText(), kongLockerPrincipal });

        const regResult = await actor.register_kong_locker(userPrincipal, kongLockerPrinc);

        if ('Err' in regResult) {
          console.warn('[AdminService] Kong Locker registration failed (may already be registered):', regResult.Err);
        } else {
          console.log('[AdminService] Kong Locker registered successfully');
        }
      } catch (err) {
        console.warn('[AdminService] Failed to register Kong Locker:', err);
        // Continue anyway - might already be registered
      }
    }

    // Admin creates vote tracking for this request
    const result = await actor.ensure_proposal_for_request(
      tokenPrincipal,
      requestId,
      operationType  // Pass as string, not variant
    );

    console.log('[AdminService] Ensure proposal result:', result);

    if ('Err' in result) {
      throw new Error(JSON.stringify(result.Err));
    }
    return result.Ok;
  }
}

export const getAdminService = (identity: any): AdminService => {
  return new AdminService(identity);
};
