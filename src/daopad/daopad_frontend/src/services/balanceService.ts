import { HttpAgent, Actor } from "@dfinity/agent";
import { Principal } from "@dfinity/principal";

// Canister IDs
const ICP_LEDGER_CANISTER_ID = "ryjl3-tyaaa-aaaaa-aaaba-cai";
const ALEX_CANISTER_ID = "ysy5f-2qaaa-aaaap-qkmmq-cai";
const ICP_SWAP_CANISTER_ID = "54fqz-5iaaa-aaaap-qkmqa-cai";

// IDL for ICRC1 balance query
const icrc1Idl = ({ IDL }) => {
  const Account = IDL.Record({
    'owner': IDL.Principal,
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  return IDL.Service({
    'icrc1_balance_of': IDL.Func([Account], [IDL.Nat], ['query']),
  });
};

// IDL for ICP Swap get_stake query
const icpSwapIdl = ({ IDL }) => {
  const Stake = IDL.Record({
    'amount': IDL.Nat64,
    'time': IDL.Nat64,
    'reward_icp': IDL.Nat64,
  });
  return IDL.Service({
    'get_stake': IDL.Func([IDL.Principal], [IDL.Opt(Stake)], ['query']),
  });
};

export const createBalanceService = (identity) => {
  const isLocal = import.meta.env.VITE_DFX_NETWORK === "local";
  const host = isLocal ? "http://localhost:4943" : "https://icp0.io";
  console.log("Creating balance service with host:", host, "isLocal:", isLocal);
  
  const agent = new HttpAgent({
    identity,
    host,
  });

  // Create a promise for root key fetching
  const rootKeyPromise = isLocal 
    ? agent.fetchRootKey().then(() => {
        console.log("Root key fetched successfully");
      }).catch((error) => {
        console.error("Failed to fetch root key:", error);
      })
    : Promise.resolve();

  const getIcpBalance = async (principal) => {
    await rootKeyPromise; // Ensure root key is fetched before querying
    console.log("Fetching ICP balance for principal:", principal.toString());
    const actor = Actor.createActor(icrc1Idl, {
      agent,
      canisterId: ICP_LEDGER_CANISTER_ID,
    });
    
    try {
      const account = {
        owner: principal,
        subaccount: [],
      };
      console.log("Calling icrc1_balance_of with account:", account);
      const balance = await actor.icrc1_balance_of(account);
      console.log("ICP balance received:", balance.toString());
      return balance.toString();
    } catch (error) {
      console.error("Error fetching ICP balance:", error);
      return "0";
    }
  };

  const getAlexBalance = async (principal) => {
    const actor = Actor.createActor(icrc1Idl, {
      agent,
      canisterId: ALEX_CANISTER_ID,
    });
    
    try {
      const balance = await actor.icrc1_balance_of({
        owner: principal,
        subaccount: [],
      });
      return balance.toString();
    } catch (error) {
      console.error("Error fetching ALEX balance:", error);
      return "0";
    }
  };

  const getStakedAlexBalance = async (principal) => {
    const actor = Actor.createActor(icpSwapIdl, {
      agent,
      canisterId: ICP_SWAP_CANISTER_ID,
    });
    
    try {
      const stake = await actor.get_stake(principal);
      return stake && stake[0] ? stake[0].amount.toString() : "0";
    } catch (error) {
      console.error("Error fetching staked ALEX balance:", error);
      return "0";
    }
  };

  return {
    getIcpBalance,
    getAlexBalance,
    getStakedAlexBalance,
  };
};

// Convert e8s to display format (divide by 10^8)
export const e8sToDisplay = (e8s) => {
  const e8sNum = typeof e8s === "string" ? Number(e8s) : Number(e8s ?? 0);
  return (e8sNum / 100_000_000).toFixed(2);
};