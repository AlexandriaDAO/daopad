import { ActorSubclass, HttpAgent, Actor } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { AuthClient } from '@dfinity/auth-client';
import { idlFactory } from '../../declarations/admin';
import type { _SERVICE } from '../../declarations/admin/admin.did.d';

// Admin canister ID (hardcoded as per backend)
const ADMIN_CANISTER_ID = 'odkrm-viaaa-aaaap-qp2oq-cai';

// Use the generated type from Candid declarations
type AdminActor = _SERVICE;

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

      // Create actor using generated IDL factory
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
    const result = await actor.vote_on_proposal(Principal.fromText(tokenId), orbitRequestId, vote);

    // Handle Result type - throw error if Err variant
    if ('Err' in result) {
      const error = result.Err;
      if ('Custom' in error) {
        throw new Error(error.Custom);
      } else if ('NoVotingPower' in error) {
        throw new Error('You need LP tokens to vote.');
      } else if ('AlreadyVoted' in error) {
        throw new Error('You have already voted on this proposal.');
      } else if ('NotActive' in error) {
        throw new Error('This proposal is no longer active.');
      } else if ('Expired' in error) {
        throw new Error('This proposal has expired.');
      } else if ('AuthRequired' in error) {
        throw new Error('Authentication required.');
      } else {
        throw new Error(`Vote failed: ${JSON.stringify(error)}`);
      }
    }
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

  async ensureProposalForRequest(tokenId: string, orbitRequestId: string, requestType: string): Promise<bigint> {
    const actor = await this.getActor();
    const result = await actor.ensure_proposal_for_request(Principal.fromText(tokenId), orbitRequestId, requestType);

    // Handle Result type
    if ('Err' in result) {
      const error = result.Err;
      if ('Custom' in error) {
        throw new Error(error.Custom);
      } else {
        throw new Error(`Failed to create proposal: ${JSON.stringify(error)}`);
      }
    }

    return result.Ok;
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