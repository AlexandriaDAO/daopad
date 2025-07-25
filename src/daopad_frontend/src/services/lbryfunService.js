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
  const isLocal = import.meta.env.VITE_DFX_NETWORK === "local";
  const host = isLocal ? "http://localhost:4943" : "https://ic0.app";
  
  const agent = new HttpAgent({ host });

  // Fetch root key for local development
  if (isLocal) {
    await agent.fetchRootKey();
  }

  return Actor.createActor(idlFactory, {
    agent,
    canisterId: LBRY_FUN_CANISTER_ID,
  });
};

// ICRC1 IDL for token metadata
const icrc1IdlFactory = ({ IDL }) => {
  const MetadataValue = IDL.Variant({
    Nat: IDL.Nat,
    Text: IDL.Text,
    Blob: IDL.Vec(IDL.Nat8),
  });
  
  return IDL.Service({
    icrc1_metadata: IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, MetadataValue))], ['query']),
    icrc1_total_supply: IDL.Func([], [IDL.Nat], ['query']),
  });
};

// Simple in-memory cache for token metadata
const metadataCache = new Map();

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
                Date.now() * 1000000 > (Number(record.created_time) + Number(record.launch_delay_seconds) * 1000000000),
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

  async getTokenMetadata(tokenPrincipal) {
    try {
      const agent = new HttpAgent({
        host: process.env.DFX_NETWORK === 'ic' ? 'https://ic0.app' : 'http://localhost:4943',
      });

      if (process.env.DFX_NETWORK !== 'ic') {
        await agent.fetchRootKey();
      }

      const actor = Actor.createActor(icrc1IdlFactory, {
        agent,
        canisterId: tokenPrincipal,
      });
      
      const metadata = await actor.icrc1_metadata();
      const totalSupply = await actor.icrc1_total_supply();
      
      // Parse metadata array
      const metadataMap = {};
      metadata.forEach(([key, value]) => {
        if (value.Text !== undefined) {
          metadataMap[key] = value.Text;
        } else if (value.Nat !== undefined) {
          metadataMap[key] = Number(value.Nat);
        } else if (value.Blob !== undefined) {
          // Handle blob data (e.g., for logos)
          metadataMap[key] = value.Blob;
        }
      });
      
      return {
        logo: metadataMap['icrc1:logo'] || metadataMap['logo'],
        description: metadataMap['description'],
        name: metadataMap['icrc1:name'] || metadataMap['name'],
        symbol: metadataMap['icrc1:symbol'] || metadataMap['symbol'],
        decimals: metadataMap['icrc1:decimals'] || 8,
        totalSupply: Number(totalSupply),
      };
    } catch (error) {
      console.error('Error fetching token metadata:', error);
      // Return minimal metadata on error
      return {
        logo: null,
        description: null,
        totalSupply: 0,
      };
    }
  },

  async getTokenMetadataCached(tokenPrincipal) {
    const key = tokenPrincipal.toString();
    
    // Check cache first
    if (metadataCache.has(key)) {
      return metadataCache.get(key);
    }
    
    // Fetch and cache
    const metadata = await this.getTokenMetadata(tokenPrincipal);
    metadataCache.set(key, metadata);
    return metadata;
  },

  async getEnhancedPoolData(pool) {
    // Calculate time until live
    const now = Date.now() * 1000000; // Convert to nanoseconds
    const launchTime = Number(pool.created_time) + (Number(pool.launch_delay_seconds) * 1000000000);
    const timeUntilLive = pool.isLive ? 0 : Math.max(0, (launchTime - now) / 1000000000); // Convert back to seconds
    
    // Format creator principal
    const creatorShort = pool.caller.toString().slice(0, 8) + '...';
    
    // Calculate supply percentage if we have metadata
    let supplyPercentage = 0;
    try {
      const primaryMetadata = await this.getTokenMetadataCached(pool.primary_token_id);
      if (primaryMetadata.totalSupply > 0) {
        supplyPercentage = (primaryMetadata.totalSupply / Number(pool.primary_token_max_supply)) * 100;
      }
    } catch (error) {
      console.error('Error calculating supply percentage:', error);
    }
    
    return {
      ...pool,
      timeUntilLive, // in seconds
      creatorShort,
      supplyPercentage: supplyPercentage.toFixed(1),
    };
  },

  // Clear cache periodically (optional)
  clearMetadataCache() {
    metadataCache.clear();
  },
};