import { Actor, HttpAgent } from '@dfinity/agent';

// LP Locking Backend Canister ID
const LP_LOCKING_BACKEND_ID = 'eazgb-giaaa-aaaap-qqc2q-cai';

// IDL Factory for LP Locking Backend
const idlFactory = ({ IDL }) => {
  const LPBalancesReply = IDL.Record({
    'symbol': IDL.Text,
    'balance': IDL.Float64,
    'lp_token_id': IDL.Nat64,
    'name': IDL.Text,
    'usd_balance': IDL.Float64,
    'chain_0': IDL.Text,
    'symbol_0': IDL.Text,
    'address_0': IDL.Text,
    'amount_0': IDL.Float64,
    'usd_amount_0': IDL.Float64,
    'chain_1': IDL.Text,
    'symbol_1': IDL.Text,
    'address_1': IDL.Text,
    'amount_1': IDL.Float64,
    'usd_amount_1': IDL.Float64,
    'ts': IDL.Nat64,
  });

  const Result = IDL.Variant({
    'Ok': IDL.Nat,
    'Err': IDL.Text,
  });

  return IDL.Service({
    'sync_voting_power': IDL.Func([], [Result], []),
    'get_voting_power': IDL.Func([], [IDL.Nat], ['query']),
    'get_all_voting_powers': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))], ['query']),
    'get_lp_positions': IDL.Func([], [IDL.Vec(LPBalancesReply)], ['query']),
    'get_all_lp_positions': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(LPBalancesReply)))], ['query']),
    'register_with_kongswap': IDL.Func([], [IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text })], []),
  });
};

export const getLPLockingActor = async (identity) => {
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
    canisterId: LP_LOCKING_BACKEND_ID,
  });
};

export class LPLockingService {
  constructor(identity) {
    this.identity = identity;
    this.actor = null;
  }

  async getActor() {
    if (!this.actor || this.identity !== this.lastIdentity) {
      this.actor = await getLPLockingActor(this.identity);
      this.lastIdentity = this.identity;
    }
    return this.actor;
  }

  async syncVotingPower() {
    try {
      const actor = await this.getActor();
      const result = await actor.sync_voting_power();
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to sync voting power:', error);
      return { success: false, error: error.message };
    }
  }

  async getVotingPower() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_voting_power();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get voting power:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllVotingPowers() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_all_voting_powers();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get all voting powers:', error);
      return { success: false, error: error.message };
    }
  }

  async getLPPositions() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_lp_positions();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get LP positions:', error);
      return { success: false, error: error.message };
    }
  }

  async getAllLPPositions() {
    try {
      const actor = await this.getActor();
      const result = await actor.get_all_lp_positions();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get all LP positions:', error);
      return { success: false, error: error.message };
    }
  }

  async registerWithKongSwap() {
    try {
      const actor = await this.getActor();
      const result = await actor.register_with_kongswap();
      if ('Ok' in result) {
        return { success: true, data: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error('Failed to register with KongSwap:', error);
      return { success: false, error: error.message };
    }
  }
}