import { HttpAgent, Actor } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

// LP Locking canister ID from canister_ids.json
const LP_LOCKING_CANISTER_ID = "7zv6y-5qaaa-aaaar-qbviq-cai";

// IDL for LP Locking canister (updated for subaccount system)
const lpLockingIdl = ({ IDL }) => {
  const UserLPData = IDL.Record({
    'account_id': IDL.Text,
    'voting_power': IDL.Nat,
    'last_sync': IDL.Nat64,
  });

  const Result_Text = IDL.Variant({
    'Ok': IDL.Text,
    'Err': IDL.Text,
  });

  const Result_Nat = IDL.Variant({
    'Ok': IDL.Nat,
    'Err': IDL.Text,
  });

  return IDL.Service({
    // Subaccount-based registration and address functions
    'register_for_lp_locking': IDL.Func([], [Result_Text], []),
    'get_my_lp_address': IDL.Func([], [Result_Text], ['query']),
    
    // Voting power functions
    'sync_my_voting_power': IDL.Func([], [Result_Nat], []),
    'get_my_voting_power': IDL.Func([], [IDL.Nat], ['query']),
    
    // Admin/display functions
    'get_all_voting_powers': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Nat, IDL.Text))], ['query']),
    
    // Legacy compatibility
    'get_address': IDL.Func([], [IDL.Text], ['query']),
    'register_with_kongswap': IDL.Func([], [Result_Text], []),
  });
};

export class LPLockingService {
  constructor(identity) {
    const isLocal = import.meta.env.VITE_DFX_NETWORK === "local";
    const host = isLocal ? "http://localhost:4943" : "https://icp0.io";
    
    this.agent = new HttpAgent({
      identity,
      host,
    });

    // Fetch root key for local development
    if (isLocal) {
      this.agent.fetchRootKey().catch(console.error);
    }

    this.actor = Actor.createActor(lpLockingIdl, {
      agent: this.agent,
      canisterId: LP_LOCKING_CANISTER_ID,
    });
  }

  /**
   * Register for LP locking and get unique account ID
   * @returns {Promise<{success: boolean, address?: string, error?: string}>}
   */
  async registerForLpLocking() {
    try {
      const result = await this.actor.register_for_lp_locking();
      
      if ('Ok' in result) {
        return { success: true, address: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error("Error registering for LP locking:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get the user's LP locking address (account ID)
   * @returns {Promise<string|null>} The user's unique LP address or null if not registered
   */
  async getMyLpAddress() {
    try {
      const result = await this.actor.get_my_lp_address();
      
      if ('Ok' in result) {
        return result.Ok;
      } else {
        console.log("User not registered:", result.Err);
        return null;
      }
    } catch (error) {
      console.error("Error fetching LP address:", error);
      return null;
    }
  }

  /**
   * Sync voting power by querying KongSwap for account balance
   * @returns {Promise<{success: boolean, votingPower?: bigint, error?: string}>}
   */
  async syncMyVotingPower() {
    try {
      const result = await this.actor.sync_my_voting_power();
      
      if ('Ok' in result) {
        return { success: true, votingPower: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error("Error syncing voting power:", error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Get current voting power (from cache, no sync)
   * @returns {Promise<bigint>} The current voting power
   */
  async getMyVotingPower() {
    try {
      const result = await this.actor.get_my_voting_power();
      return result;
    } catch (error) {
      console.error("Error fetching voting power:", error);
      return 0n;
    }
  }

  /**
   * Get all users' voting powers (admin function)
   * @returns {Promise<Array<{principal: string, votingPower: bigint, accountId: string}>>}
   */
  async getAllVotingPowers() {
    try {
      const result = await this.actor.get_all_voting_powers();
      return result.map(([principal, votingPower, accountId]) => ({
        principal: principal.toString(),
        votingPower,
        accountId,
      }));
    } catch (error) {
      console.error("Error fetching all voting powers:", error);
      return [];
    }
  }

  /**
   * Get canister's main address (legacy)
   * @returns {Promise<string>} The canister's principal as string
   */
  async getAddress() {
    try {
      return await this.actor.get_address();
    } catch (error) {
      console.error("Error fetching address:", error);
      return "";
    }
  }

  /**
   * Register canister with KongSwap (admin function)
   * @returns {Promise<{success: boolean, message?: string, error?: string}>}
   */
  async registerWithKongswap() {
    try {
      const result = await this.actor.register_with_kongswap();
      
      if ('Ok' in result) {
        return { success: true, message: result.Ok };
      } else {
        return { success: false, error: result.Err };
      }
    } catch (error) {
      console.error("Error registering with KongSwap:", error);
      return { success: false, error: error.message };
    }
  }
}

// Convert e8s to display format (for consistency with other balance displays)
export const lpToDisplay = (lpAmount) => {
  const amountNum = Number(lpAmount);
  return (amountNum / 100_000_000).toFixed(4);
};

// Format voting power for display
export const formatVotingPower = (power) => {
  if (!power) return '0';
  const powerValue = Number(power) / 100_000_000;
  return powerValue.toFixed(4);
};