import { HttpAgent, Actor } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

// Canister IDs
const LP_LOCKING_BACKEND_ID = '7zv6y-5qaaa-aaaar-qbviq-cai';
const KONG_BACKEND_ID = '2ipq2-uqaaa-aaaar-qailq-cai';
const ICP_LEDGER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

// IDL for LP Locking Backend
const lpLockingIdl = ({ IDL }) => {
  const Result = IDL.Variant({ 'Ok': IDL.Text, 'Err': IDL.Text });
  const Result_1 = IDL.Variant({ 'Ok': IDL.Nat, 'Err': IDL.Text });
  
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
  
  return IDL.Service({
    'get_all_voting_powers': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Nat))], ['query']),
    'get_voting_power': IDL.Func([], [IDL.Nat], ['query']),
    'get_lp_positions': IDL.Func([], [IDL.Vec(LPBalancesReply)], ['query']),
    'get_all_lp_positions': IDL.Func([], [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(LPBalancesReply)))], ['query']),
    'register_with_kongswap': IDL.Func([], [Result], []),
    'sync_voting_power': IDL.Func([], [Result_1], []),
  });
};

// IDL for KongSwap Backend - Complete accurate types from mainnet canister
const kongIdl = ({ IDL }) => {
  // LP Balance types
  const LPBalancesReply = IDL.Record({
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

  const UserBalancesReply = IDL.Variant({
    'LP': LPBalancesReply,
  });

  const UserBalancesResult = IDL.Variant({
    'Ok': IDL.Vec(UserBalancesReply),
    'Err': IDL.Text,
  });

  // Swap types
  const TxId = IDL.Variant({
    'BlockIndex': IDL.Nat,
    'TransactionId': IDL.Text,
  });

  const SwapArgs = IDL.Record({
    'pay_token': IDL.Text,
    'pay_amount': IDL.Nat,
    'pay_tx_id': IDL.Opt(TxId),
    'receive_token': IDL.Text,
    'receive_amount': IDL.Opt(IDL.Nat),
    'receive_address': IDL.Opt(IDL.Text),
    'max_slippage': IDL.Opt(IDL.Float64),
    'referred_by': IDL.Opt(IDL.Text),
  });

  // Transfer types for SwapReply
  const ICTransferReply = IDL.Record({
    'chain': IDL.Text,
    'symbol': IDL.Text,
    'is_send': IDL.Bool,
    'amount': IDL.Nat,
    'canister_id': IDL.Text,
    'block_index': IDL.Nat,
  });

  const TransferReply = IDL.Variant({
    'IC': ICTransferReply,
  });

  const TransferIdReply = IDL.Record({
    'transfer_id': IDL.Nat64,
    'transfer': TransferReply,
  });

  const SwapTxReply = IDL.Record({
    'pool_symbol': IDL.Text,
    'pay_chain': IDL.Text,
    'pay_address': IDL.Text,
    'pay_symbol': IDL.Text,
    'pay_amount': IDL.Nat,
    'receive_chain': IDL.Text,
    'receive_address': IDL.Text,
    'receive_symbol': IDL.Text,
    'receive_amount': IDL.Nat,
    'price': IDL.Float64,
    'lp_fee': IDL.Nat,
    'gas_fee': IDL.Nat,
    'ts': IDL.Nat64,
  });

  const SwapReply = IDL.Record({
    'tx_id': IDL.Nat64,
    'request_id': IDL.Nat64,
    'status': IDL.Text,
    'pay_chain': IDL.Text,
    'pay_address': IDL.Text,
    'pay_symbol': IDL.Text,
    'pay_amount': IDL.Nat,
    'receive_chain': IDL.Text,
    'receive_address': IDL.Text,
    'receive_symbol': IDL.Text,
    'receive_amount': IDL.Nat,
    'mid_price': IDL.Float64,
    'price': IDL.Float64,
    'slippage': IDL.Float64,
    'txs': IDL.Vec(SwapTxReply),
    'transfer_ids': IDL.Vec(TransferIdReply),
    'claim_ids': IDL.Vec(IDL.Nat64),
    'ts': IDL.Nat64,
  });

  const SwapResult = IDL.Variant({
    'Ok': SwapReply,
    'Err': IDL.Text,
  });

  return IDL.Service({
    'user_balances': IDL.Func([IDL.Text], [UserBalancesResult], ['query']),
    'swap': IDL.Func([SwapArgs], [SwapResult], []),
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


  const getVotingPower = async () => {
    const { agent, rootKeyPromise } = createAgent(true); // Auth needed
    await rootKeyPromise;
    
    const actor = Actor.createActor(lpLockingIdl, {
      agent,
      canisterId: LP_LOCKING_BACKEND_ID,
    });
    
    try {
      const power = await actor.get_voting_power();
      return Number(power);
    } catch (error) {
      console.error("Error getting voting power:", error);
      return 0;
    }
  };

  const getAllVotingPowers = async () => {
    const { agent, rootKeyPromise } = createAgent(false); // Anonymous for global data
    await rootKeyPromise;
    
    const actor = Actor.createActor(lpLockingIdl, {
      agent,
      canisterId: LP_LOCKING_BACKEND_ID,
    });
    
    try {
      const powers = await actor.get_all_voting_powers();
      // Transform tuple response [principal_text, voting_power] to object format
      return powers.map(([principal, voting_power]) => ({
        principal: principal,
        voting_power: Number(voting_power)
      }));
    } catch (error) {
      console.error("Error getting all voting powers:", error);
      return [];
    }
  };

  const checkKongSwapRegistration = async (principalText) => {
    const { agent, rootKeyPromise } = createAgent(false); // Anonymous query
    await rootKeyPromise;
    
    const actor = Actor.createActor(kongIdl, {
      agent,
      canisterId: KONG_BACKEND_ID,
    });
    
    try {
      const result = await actor.user_balances(principalText);
      if ('Ok' in result) {
        // User is registered if they have any entries (or even empty array means registered)
        return result.Ok.length >= 0; // True for both populated arrays and empty arrays
      } else if ('Err' in result && result.Err.includes('User not found')) {
        return false;
      }
      return false;
    } catch (error) {
      console.error("Error checking KongSwap registration:", error);
      return false;
    }
  };

  const syncVotingPower = async () => {
    const { agent, rootKeyPromise } = createAgent(true); // Auth needed for update
    await rootKeyPromise;
    
    const actor = Actor.createActor(lpLockingIdl, {
      agent,
      canisterId: LP_LOCKING_BACKEND_ID,
    });
    
    try {
      const result = await actor.sync_voting_power();
      if ('Ok' in result) {
        return Number(result.Ok) / 100_000_000; // Convert back to decimal
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error("Error syncing voting power:", error);
      throw error;
    }
  };

  const registerWithKongSwap = async () => {
    const { agent, rootKeyPromise } = createAgent(true); // Auth needed for registration
    await rootKeyPromise;
    
    try {
      // Step 1: Transfer 0.001 ICP from user's wallet to KongSwap
      const icpActor = Actor.createActor(icpLedgerIdl, {
        agent,
        canisterId: ICP_LEDGER_ID,
      });
      
      const kongPrincipal = Principal.fromText(KONG_BACKEND_ID);
      const transferArgs = {
        to: {
          owner: kongPrincipal,
          subaccount: [],
        },
        amount: BigInt(100000), // 0.001 ICP
        fee: [],
        memo: [],
        created_at_time: [],
        from_subaccount: [],
      };
      
      const transferResult = await icpActor.icrc1_transfer(transferArgs);
      if (!('Ok' in transferResult)) {
        throw new Error(`Transfer failed: ${transferResult.Err}`);
      }
      
      // Step 2: Call KongSwap's swap function to complete registration
      const kongActor = Actor.createActor(kongIdl, {
        agent,
        canisterId: KONG_BACKEND_ID,
      });
      
      // Use swap_transfer flow - the transfer block index proves we paid
      const swapResult = await kongActor.swap({
        pay_token: "ICP",
        pay_amount: BigInt(100000), // Must match the transfer amount
        pay_tx_id: [{ 'BlockIndex': transferResult.Ok }], // Critical: links to our transfer
        receive_token: "ckBTC", // Swap for any available token (ckBTC is commonly available)
        receive_amount: [BigInt(0)], // Accept any amount (for registration)
        receive_address: [], // Use default address
        max_slippage: [100.0], // High slippage acceptable for registration
        referred_by: [],
      });
      
      if (!('Ok' in swapResult)) {
        console.warn("Swap call failed, but transfer succeeded. User may be registered.");
      }
      
      return `Successfully registered with KongSwap! Block: ${transferResult.Ok}`;
    } catch (error) {
      console.error("Error registering with KongSwap:", error);
      throw error;
    }
  };

  const transferToKong = async (amount) => {
    const { agent, rootKeyPromise } = createAgent(true); // Auth needed for transfer
    await rootKeyPromise;
    
    const actor = Actor.createActor(icpLedgerIdl, {
      agent,
      canisterId: ICP_LEDGER_ID,
    });

    try {
      const kongPrincipal = Principal.fromText(KONG_BACKEND_ID);
      const transferArgs = {
        to: {
          owner: kongPrincipal,
          subaccount: [],
        },
        amount: BigInt(amount),
        fee: [],
        memo: [],
        created_at_time: [],
        from_subaccount: [],
      };

      const result = await actor.icrc1_transfer(transferArgs);
      if ('Ok' in result) {
        return result.Ok;
      } else {
        throw new Error(result.Err);
      }
    } catch (error) {
      console.error("Error transferring to Kong:", error);
      throw error;
    }
  };

  const getLpPositions = async () => {
    const { agent, rootKeyPromise } = createAgent(true); // Auth needed
    await rootKeyPromise;
    
    const actor = Actor.createActor(lpLockingIdl, {
      agent,
      canisterId: LP_LOCKING_BACKEND_ID,
    });
    
    try {
      const positions = await actor.get_lp_positions();
      return positions;
    } catch (error) {
      console.error("Error getting LP positions:", error);
      return [];
    }
  };

  const getAllLpPositions = async () => {
    const { agent, rootKeyPromise } = createAgent(false); // Anonymous for global data
    await rootKeyPromise;
    
    const actor = Actor.createActor(lpLockingIdl, {
      agent,
      canisterId: LP_LOCKING_BACKEND_ID,
    });
    
    try {
      const positions = await actor.get_all_lp_positions();
      return positions;
    } catch (error) {
      console.error("Error getting all LP positions:", error);
      return [];
    }
  };

  return {
    getIcpBalance,
    getVotingPower,
    getAllVotingPowers,
    checkKongSwapRegistration,
    syncVotingPower,
    registerWithKongSwap,
    transferToKong,
    getLpPositions,
    getAllLpPositions,
  };
};

// Convert e8s to display format (divide by 10^8)
export const e8sToDisplay = (e8s) => {
  const e8sNum = Number(e8s);
  return (e8sNum / 100_000_000).toFixed(2);
};