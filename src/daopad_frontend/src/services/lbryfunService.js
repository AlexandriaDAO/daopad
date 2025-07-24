import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

const LBRY_FUN_CANISTER_ID = 'oni4e-oyaaa-aaaap-qp2pq-cai';

// Manual IDL definition for lbry_fun canister
const idlFactory = ({ IDL }) => {
  const TokenRecord = IDL.Record({
    id: IDL.Nat64,
    secondary_token_symbol: IDL.Text,
    secondary_token_id: IDL.Principal,
    primary_token_name: IDL.Text,
    tokenomics_canister_id: IDL.Principal,
    secondary_token_name: IDL.Text,
    primary_token_symbol: IDL.Text,
    launch_delay_seconds: IDL.Nat64,
    icp_swap_canister_id: IDL.Principal,
    halving_step: IDL.Nat64,
    primary_token_max_supply: IDL.Nat64,
    pool_creation_failed: IDL.Bool,
    initial_reward_per_burn_unit: IDL.Nat64,
    initial_primary_mint: IDL.Nat64,
    threshold_multiplier: IDL.Float64,
    primary_token_id: IDL.Principal,
    caller: IDL.Principal,
    pool_created_at: IDL.Nat64,
    distribution_interval_seconds: IDL.Nat64,
    created_time: IDL.Nat64,
    initial_secondary_burn: IDL.Nat64,
    logs_canister_id: IDL.Principal,
  });

  const TokenStatusDetail = IDL.Record({
    is_live: IDL.Bool,
    secondary_token_symbol: IDL.Text,
    token_id: IDL.Nat64,
    primary_token_symbol: IDL.Text,
    pool_creation_failed: IDL.Bool,
    pool_created_at: IDL.Nat64,
    created_time: IDL.Nat64,
    time_until_live_nanos: IDL.Nat64,
  });

  return IDL.Service({
    get_all_token_record: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Nat64, TokenRecord))], ['query']),
    get_live: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Nat64, TokenRecord))], ['query']),
    get_upcomming: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Nat64, TokenRecord))], ['query']),
    get_token_status: IDL.Func([IDL.Nat64], [IDL.Opt(TokenStatusDetail)], ['query']),
  });
};

const createActor = async () => {
  const agent = new HttpAgent({
    host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:4943',
  });

  // Fetch root key for local development
  if (process.env.DFX_NETWORK !== 'ic') {
    await agent.fetchRootKey();
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: LBRY_FUN_CANISTER_ID,
  });
};

export const lbryfunService = {
  async getAllTokenRecords() {
    try {
      const actor = await createActor();
      const records = await actor.get_all_token_record();
      
      // Transform the data to match our needs
      return records.map(([id, record]) => ({
        id: Number(id),
        ...record,
        // Calculate if pool is live based on the same logic as lbryfun
        isLive: !record.pool_creation_failed && 
                record.pool_created_at > 0 && 
                Date.now() / 1000000 > (Number(record.created_time) + Number(record.launch_delay_seconds) * 1000),
      }));
    } catch (error) {
      console.error('Error fetching token records:', error);
      throw error;
    }
  },

  async getLiveTokens() {
    try {
      const actor = await createActor();
      const records = await actor.get_live();
      
      return records.map(([id, record]) => ({
        id: Number(id),
        ...record,
        isLive: true,
      }));
    } catch (error) {
      console.error('Error fetching live tokens:', error);
      throw error;
    }
  },

  async getUpcomingTokens() {
    try {
      const actor = await createActor();
      const records = await actor.get_upcomming();
      
      return records.map(([id, record]) => ({
        id: Number(id),
        ...record,
        isLive: false,
      }));
    } catch (error) {
      console.error('Error fetching upcoming tokens:', error);
      throw error;
    }
  },

  async getTokenStatus(tokenId) {
    try {
      const actor = await createActor();
      const status = await actor.get_token_status(tokenId);
      return status;
    } catch (error) {
      console.error('Error fetching token status:', error);
      throw error;
    }
  },
};