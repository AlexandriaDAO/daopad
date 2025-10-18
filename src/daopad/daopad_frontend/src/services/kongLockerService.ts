import { Actor, HttpAgent } from '@dfinity/agent';
import { IDL } from '@dfinity/candid';

// Kong Locker Factory Canister ID
const KONG_LOCKER_FACTORY_ID = 'eazgb-giaaa-aaaap-qqc2q-cai';
// KongSwap Canister ID for direct LP position queries
const KONGSWAP_ID = '2ipq2-uqaaa-aaaar-qailq-cai';

// IDL Factory for Kong Locker Factory
const kongLockerIdlFactory = () => {
  return IDL.Service({
    'get_all_lock_canisters': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Principal))], ['query']),
    'get_my_lock_canister': IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'get_total_positions_count': IDL.Func([], [IDL.Nat64], ['query']),
  });
};

// IDL Factory for KongSwap direct queries
const kongSwapIdlFactory = () => {
  const LPReply = IDL.Record({
    'name': IDL.Text,
    'symbol': IDL.Text,
    'lp_token_id': IDL.Nat64,
    'balance': IDL.Float64,
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

  // UserBalancesReply is a Variant, not a Record!
  const UserBalancesReply = IDL.Variant({ 'LP': LPReply });

  return IDL.Service({
    'user_balances': IDL.Func(
      [IDL.Text],
      [IDL.Variant({
        'Ok': IDL.Vec(UserBalancesReply),
        'Err': IDL.Text
      })],
      ['query']
    ),
  });
};

export const getKongLockerActor = async (identity) => {
  const isLocal = import.meta.env.VITE_DFX_NETWORK === 'local';
  const host = isLocal ? 'http://localhost:4943' : 'https://icp0.io';

  const agent = new HttpAgent({
    identity,
    host,
  });

  if (isLocal) {
    await agent.fetchRootKey();
  }

  return Actor.createActor(kongLockerIdlFactory, {
    agent,
    canisterId: KONG_LOCKER_FACTORY_ID,
  });
};

export const getKongSwapActor = async (identity) => {
  const isLocal = import.meta.env.VITE_DFX_NETWORK === 'local';
  const host = isLocal ? 'http://localhost:4943' : 'https://icp0.io';

  const agent = new HttpAgent({
    identity,
    host,
  });

  if (isLocal) {
    await agent.fetchRootKey();
  }

  return Actor.createActor(kongSwapIdlFactory, {
    agent,
    canisterId: KONGSWAP_ID,
  });
};

export class KongLockerService {
  constructor(identity) {
    this.identity = identity;
    this.kongLockerActor = null;
    this.kongSwapActor = null;
  }

  async getKongLockerActor() {
    if (!this.kongLockerActor || this.identity !== this.lastIdentity) {
      this.kongLockerActor = await getKongLockerActor(this.identity);
      this.lastIdentity = this.identity;
    }
    return this.kongLockerActor;
  }

  async getKongSwapActor() {
    if (!this.kongSwapActor || this.identity !== this.lastKongSwapIdentity) {
      this.kongSwapActor = await getKongSwapActor(this.identity);
      this.lastKongSwapIdentity = this.identity;
    }
    return this.kongSwapActor;
  }

  // Get user's lock canister from Kong Locker factory
  async getMyLockCanister() {
    try {
      const actor = await this.getKongLockerActor();
      const result = await actor.get_my_lock_canister();
      return { success: true, data: result[0] || null };
    } catch (error) {
      console.error('Failed to get lock canister:', error);
      return { success: false, error: error.message };
    }
  }

  // Get all lock canisters (for validation)
  async getAllLockCanisters() {
    try {
      const actor = await this.getKongLockerActor();
      const result = await actor.get_all_lock_canisters();
      return { success: true, data: result };
    } catch (error) {
      console.error('Failed to get all lock canisters:', error);
      return { success: false, error: error.message };
    }
  }

  // Get LP positions for a specific lock canister by querying KongSwap directly
  async getLPPositions(lockCanisterPrincipal) {
    try {
      const actor = await this.getKongSwapActor();
      const result = await actor.user_balances(lockCanisterPrincipal);

      // Handle the variant response
      if (result && 'Ok' in result) {
        // UserBalancesReply is a Variant with 'LP' key, extract the LP data
        const lpPositions = result.Ok.map(reply => reply.LP);
        return { success: true, data: lpPositions };
      } else if (result && 'Err' in result) {
        // Handle specific error cases
        if (result.Err.includes('User not found')) {
          return { success: true, data: [] }; // Not registered yet, return empty array
        }
        return { success: false, error: result.Err };
      } else {
        return { success: false, error: 'Invalid response from KongSwap' };
      }
    } catch (error) {
      console.error('Failed to get LP positions from KongSwap:', error);
      return { success: false, error: error.message };
    }
  }

  // Calculate voting power from LP positions (USD value * 100)
  calculateVotingPower(lpPositions) {
    if (!lpPositions || lpPositions.length === 0) {
      return 0;
    }
    
    const totalUsdValue = lpPositions.reduce((sum, position) => {
      return sum + (position.usd_balance || 0);
    }, 0);
    
    return Math.floor(totalUsdValue * 100); // Return as integer (USD * 100)
  }

  // Get voting power for a lock canister
  async getVotingPower(lockCanisterPrincipal) {
    try {
      const positionsResult = await this.getLPPositions(lockCanisterPrincipal);
      if (!positionsResult.success) {
        return { success: false, error: positionsResult.error };
      }

      const votingPower = this.calculateVotingPower(positionsResult.data);
      return { success: true, data: votingPower };
    } catch (error) {
      console.error('Failed to calculate voting power:', error);
      return { success: false, error: error.message };
    }
  }

  // Validate that a principal is a valid lock canister
  async validateLockCanister(lockCanisterPrincipal) {
    try {
      const allCanistersResult = await this.getAllLockCanisters();
      if (!allCanistersResult.success) {
        return { success: false, error: allCanistersResult.error };
      }

      const isValid = allCanistersResult.data.some(([user, canister]) => 
        canister.toString() === lockCanisterPrincipal
      );

      if (!isValid) {
        return { success: false, error: 'Not a valid Kong Locker canister' };
      }

      return { success: true, data: true };
    } catch (error) {
      console.error('Failed to validate lock canister:', error);
      return { success: false, error: error.message };
    }
  }

  // Get system stats
  async getSystemStats() {
    try {
      const actor = await this.getKongLockerActor();
      const totalCount = await actor.get_total_positions_count();
      return { 
        success: true, 
        data: { 
          totalLockCanisters: Number(totalCount) 
        } 
      };
    } catch (error) {
      console.error('Failed to get system stats:', error);
      return { success: false, error: error.message };
    }
  }
}