import { HttpAgent, Actor } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

// Canister IDs
const LP_LOCKING_BACKEND_ID = '7zv6y-5qaaa-aaaar-qbviq-cai';
const ICP_LEDGER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

// IDL for LP Locking Backend (Factory)
const lpLockingIdl = ({ IDL }) => {
  return IDL.Service({
    // Factory methods only - no LP position tracking
    'create_lock_canister': IDL.Func([], [IDL.Variant({'Ok': IDL.Principal, 'Err': IDL.Text})], []),
    'get_my_lock_canister': IDL.Func([], [IDL.Opt(IDL.Principal)], ['query']),
    'get_all_lock_canisters': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Principal, IDL.Principal))], ['query']),
    'get_voting_power': IDL.Func([IDL.Principal], [IDL.Variant({'Ok': IDL.Nat, 'Err': IDL.Text})], []),
  });
};


// IDL for ICP Ledger
const icpLedgerIdl = ({ IDL }) => {
  const Account = IDL.Record({
    'owner': IDL.Principal,
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  return IDL.Service({
    'icrc1_balance_of': IDL.Func([Account], [IDL.Nat], ['query']),
    'icrc1_transfer': IDL.Func([IDL.Record({
      'to': Account,
      'amount': IDL.Nat,
      'fee': IDL.Opt(IDL.Nat),
      'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
      'created_at_time': IDL.Opt(IDL.Nat64),
      'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
    })], [IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text })], []),
  });
};

// ICP amount constants
export const MIN_ICP_FOR_REGISTRATION = 1.01; // 1 ICP + fees

export const createLpLockerService = (identity) => {
  const isLocal = import.meta.env.VITE_DFX_NETWORK === "local";
  const host = isLocal ? "http://localhost:4943" : "https://icp0.io";
  
  // Create agent - for queries we can use anonymous, for updates we need identity
  const createAgent = (needsAuth = false) => {
    const agent = new HttpAgent({
      identity: needsAuth ? identity : undefined,
      host,
    });

    // Fetch root key for local development
    const rootKeyPromise = isLocal 
      ? agent.fetchRootKey().then(() => {
          console.log("Root key fetched successfully");
        }).catch((error) => {
          console.error("Failed to fetch root key:", error);
        })
      : Promise.resolve();

    return { agent, rootKeyPromise };
  };

  const getIcpBalance = async (principal) => {
    const { agent, rootKeyPromise } = createAgent(false); // Anonymous for balance query
    await rootKeyPromise;
    
    const actor = Actor.createActor(icpLedgerIdl, {
      agent,
      canisterId: ICP_LEDGER_ID,
    });
    
    try {
      const account = {
        owner: principal,
        subaccount: [],
      };
      const balance = await actor.icrc1_balance_of(account);
      return balance;
    } catch (error) {
      console.error("Error fetching ICP balance:", error);
      return 0n;
    }
  };

  // Get LP positions directly from KongSwap
  const getLpPositions = async () => {
    // For now, return empty array since we don't store positions locally
    // In the future, this could query KongSwap directly
    console.log("LP positions are no longer tracked locally - query KongSwap directly");
    return [];
  };

  const createLockCanister = async () => {
    const { agent, rootKeyPromise } = createAgent(true);
    await rootKeyPromise;
    
    const actor = Actor.createActor(lpLockingIdl, {
      agent,
      canisterId: LP_LOCKING_BACKEND_ID,
    });
    
    try {
      const result = await actor.create_lock_canister();
      return result.Ok || Promise.reject(result.Err);
    } catch (error) {
      throw new Error(error.toString());
    }
  };

  const getMyLockCanister = async () => {
    const { agent, rootKeyPromise } = createAgent(true);
    await rootKeyPromise;
    
    const actor = Actor.createActor(lpLockingIdl, {
      agent,
      canisterId: LP_LOCKING_BACKEND_ID,
    });
    
    try {
      const result = await actor.get_my_lock_canister();
      console.log('🔍 DEBUG: Raw factory result:', result);
      console.log('🔍 DEBUG: Parsed result:', result[0] || null);
      return result[0] || null; // Optional<Principal>
    } catch (error) {
      console.log('🔍 DEBUG: Factory call failed:', error);
      return null;
    }
  };

  const fundLockCanister = async (lockCanisterPrincipal, amountIcp) => {
    const { agent, rootKeyPromise } = createAgent(true);
    await rootKeyPromise;
    
    const actor = Actor.createActor(icpLedgerIdl, {
      agent,
      canisterId: ICP_LEDGER_ID,
    });
    
    const transferArgs = {
      to: {
        owner: Principal.fromText(lockCanisterPrincipal),
        subaccount: [],
      },
      amount: BigInt(amountIcp * 100_000_000), // Convert to e8s
      fee: [10_000n],
      memo: [],
      created_at_time: [],
      from_subaccount: [],
    };
    
    const result = await actor.icrc1_transfer(transferArgs);
    return result.Ok || Promise.reject(result.Err);
  };

  const registerLockCanister = async (lockCanisterPrincipal) => {
    const { agent, rootKeyPromise } = createAgent(true);
    await rootKeyPromise;
    
    // Create actor for specific lock canister
    const lockCanisterIdl = ({ IDL }) => {
      return IDL.Service({
        'register_if_funded': IDL.Func([], [IDL.Variant({'Ok': IDL.Text, 'Err': IDL.Text})], []),
      });
    };
    
    const actor = Actor.createActor(lockCanisterIdl, {
      agent,
      canisterId: lockCanisterPrincipal,
    });
    
    const result = await actor.register_if_funded();
    return result.Ok || Promise.reject(result.Err);
  };

  const checkLockCanisterStatus = async (lockCanisterPrincipal) => {
    const { agent, rootKeyPromise } = createAgent(true);
    await rootKeyPromise;
    
    // Check ICP balance in lock canister
    const icpActor = Actor.createActor(icpLedgerIdl, {
      agent,
      canisterId: ICP_LEDGER_ID,
    });
    
    const balance = await icpActor.icrc1_balance_of({
      owner: Principal.fromText(lockCanisterPrincipal),
      subaccount: [],
    });
    
    // If has ICP but registration status unknown, allow retry
    return {
      hasICP: balance > 0n,
      icpAmount: balance,
      canRetryRegistration: balance >= BigInt(MIN_ICP_FOR_REGISTRATION * 100_000_000)
    };
  };


  const getVotingPower = async (userPrincipal) => {
    const { agent, rootKeyPromise } = createAgent(false); // Can be anonymous
    await rootKeyPromise;
    
    const actor = Actor.createActor(lpLockingIdl, {
      agent,
      canisterId: LP_LOCKING_BACKEND_ID,
    });
    
    try {
      const result = await actor.get_voting_power(userPrincipal);
      return result.Ok || 0n;
    } catch (error) {
      console.error("Error getting voting power:", error);
      return 0n;
    }
  };

  return {
    getIcpBalance,
    getLpPositions,
    createLockCanister,
    getMyLockCanister,
    fundLockCanister,
    registerLockCanister,
    checkLockCanisterStatus,
    getVotingPower,
  };
};

// Convert e8s to display format (divide by 10^8)
export const e8sToDisplay = (e8s) => {
  const e8sNum = Number(e8s);
  return (e8sNum / 100_000_000).toFixed(2);
};

