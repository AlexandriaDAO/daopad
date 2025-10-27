import { ActorSubclass, HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { AuthClient } from '@dfinity/auth-client';

// Admin canister ID (hardcoded as per backend)
const ADMIN_CANISTER_ID = 'odkrm-viaaa-aaaap-qp2oq-cai';

// Admin canister interface (matching what admin canister expects)
// We'll need to import the actual candid interface later
interface AdminActor {
  // Voting methods that admin canister handles
  vote_on_proposal: (token_id: Principal, orbit_request_id: string, vote: boolean) => Promise<void>;
  has_user_voted: (user: Principal, token_id: Principal, orbit_request_id: string) => Promise<boolean>;
  get_user_vote: (user: Principal, token_id: Principal, orbit_request_id: string) => Promise<{ Yes: null } | { No: null } | null>;
  get_proposal: (token_id: Principal, orbit_request_id: string) => Promise<any | null>;
  ensure_proposal_for_request: (token_id: Principal, orbit_request_id: string, request_type: string) => Promise<any>;
}

export class AdminService {
  private actor: ActorSubclass<AdminActor> | null = null;
  private identity: any;

  constructor(identity?: any) {
    this.identity = identity;
  }

  async getActor(): Promise<ActorSubclass<AdminActor>> {
    if (!this.actor) {
      // Use provided identity or get from auth client
      let actualIdentity = this.identity;

      if (!actualIdentity) {
        const authClient = await AuthClient.create();
        actualIdentity = authClient.getIdentity();
      }

      // Create agent with identity
      const agent = new HttpAgent({
        identity: actualIdentity,
        host: process.env.REACT_APP_IC_HOST || 'https://ic0.app'
      });

      // In development, fetch root key
      if (process.env.NODE_ENV === 'development') {
        await agent.fetchRootKey();
      }

      // Import the admin candid interface
      // TODO: This needs to be generated from admin canister's .did file
      const idlFactory = ({ IDL }: any) => {
        // Basic IDL for voting methods
        const VoteChoice = IDL.Variant({
          'Yes': IDL.Null,
          'No': IDL.Null,
        });

        return IDL.Service({
          'vote_on_proposal': IDL.Func([IDL.Principal, IDL.Text, IDL.Bool], [], []),
          'has_user_voted': IDL.Func([IDL.Principal, IDL.Principal, IDL.Text], [IDL.Bool], ['query']),
          'get_user_vote': IDL.Func([IDL.Principal, IDL.Principal, IDL.Text], [IDL.Opt(VoteChoice)], ['query']),
          'get_proposal': IDL.Func([IDL.Principal, IDL.Text], [IDL.Opt(IDL.Record({}))], ['query']),
          'ensure_proposal_for_request': IDL.Func([IDL.Principal, IDL.Text, IDL.Text], [IDL.Record({})], []),
        });
      };

      // Create actor
      this.actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: Principal.fromText(ADMIN_CANISTER_ID),
      });
    }

    return this.actor;
  }

  // Convenience methods for voting operations
  async voteOnProposal(tokenId: string, orbitRequestId: string, vote: boolean): Promise<void> {
    const actor = await this.getActor();
    await actor.vote_on_proposal(Principal.fromText(tokenId), orbitRequestId, vote);
  }

  async hasUserVoted(userId: Principal, tokenId: string, orbitRequestId: string): Promise<boolean> {
    const actor = await this.getActor();
    return await actor.has_user_voted(userId, Principal.fromText(tokenId), orbitRequestId);
  }

  async getUserVote(userId: Principal, tokenId: string, orbitRequestId: string): Promise<any> {
    const actor = await this.getActor();
    return await actor.get_user_vote(userId, Principal.fromText(tokenId), orbitRequestId);
  }

  async getProposal(tokenId: string, orbitRequestId: string): Promise<any> {
    const actor = await this.getActor();
    return await actor.get_proposal(Principal.fromText(tokenId), orbitRequestId);
  }

  async ensureProposalForRequest(tokenId: string, orbitRequestId: string, requestType: string): Promise<any> {
    const actor = await this.getActor();
    return await actor.ensure_proposal_for_request(Principal.fromText(tokenId), orbitRequestId, requestType);
  }
}

// Export singleton instance for convenience
let adminServiceInstance: AdminService | null = null;

export function getAdminService(identity?: any): AdminService {
  if (!adminServiceInstance || identity) {
    adminServiceInstance = new AdminService(identity);
  }
  return adminServiceInstance;
}