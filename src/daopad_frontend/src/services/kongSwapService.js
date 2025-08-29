import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';

const KONG_BACKEND_ID = '2ipq2-uqaaa-aaaar-qailq-cai';
const ICP_LEDGER_ID = 'ryjl3-tyaaa-aaaaa-aaaba-cai';

// KongSwap IDL factory (minimal interface for swap)
const kongIdlFactory = ({ IDL }) => {
  const TxId = IDL.Variant({
    'BlockIndex': IDL.Nat,
    'TransactionId': IDL.Text,
  });

  const SwapArgs = IDL.Record({
    'pay_token': IDL.Text,
    'pay_amount': IDL.Nat,
    'receive_token': IDL.Text,
    'receive_amount': IDL.Opt(IDL.Nat),
    'max_slippage': IDL.Opt(IDL.Float64),
    'referred_by': IDL.Opt(IDL.Text),
    'pay_tx_id': IDL.Opt(TxId),
  });

  const SwapReply = IDL.Record({
    'tx_id': IDL.Nat64,
    'request_id': IDL.Nat64,
    'status': IDL.Text,
    'pay_symbol': IDL.Text,
    'pay_amount': IDL.Nat,
    'receive_symbol': IDL.Text,
    'receive_amount': IDL.Nat,
    'price': IDL.Float64,
    'slippage': IDL.Float64,
    'ts': IDL.Nat64,
  });

  const UserBalancesReply = IDL.Variant({
    'LP': IDL.Record({
      'name': IDL.Text,
      'symbol': IDL.Text,
      'lp_token_id': IDL.Nat64,
      'balance': IDL.Float64,
      'usd_balance': IDL.Float64,
    }),
  });

  return IDL.Service({
    'swap': IDL.Func([SwapArgs], [IDL.Variant({
      'Ok': SwapReply,
      'Err': IDL.Text,
    })], []),
    'user_balances': IDL.Func([IDL.Text], [IDL.Variant({
      'Ok': IDL.Vec(UserBalancesReply),
      'Err': IDL.Text,
    })], ['query']),
  });
};

// ICP Ledger IDL factory (for transfers)
const icpLedgerIdlFactory = ({ IDL }) => {
  const Account = IDL.Record({
    'owner': IDL.Principal,
    'subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
  });

  const TransferArg = IDL.Record({
    'to': Account,
    'amount': IDL.Nat,
    'fee': IDL.Opt(IDL.Nat),
    'memo': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'from_subaccount': IDL.Opt(IDL.Vec(IDL.Nat8)),
    'created_at_time': IDL.Opt(IDL.Nat64),
  });

  const TransferError = IDL.Variant({
    'BadFee': IDL.Record({ 'expected_fee': IDL.Nat }),
    'InsufficientFunds': IDL.Record({ 'balance': IDL.Nat }),
    'TooOld': IDL.Null,
    'CreatedInFuture': IDL.Record({ 'ledger_time': IDL.Nat64 }),
    'TemporarilyUnavailable': IDL.Null,
    'Duplicate': IDL.Record({ 'duplicate_of': IDL.Nat }),
    'GenericError': IDL.Record({ 'error_code': IDL.Nat, 'message': IDL.Text }),
  });

  return IDL.Service({
    'icrc1_transfer': IDL.Func([TransferArg], [IDL.Variant({
      'Ok': IDL.Nat,
      'Err': TransferError,
    })], []),
    'icrc1_balance_of': IDL.Func([Account], [IDL.Nat], ['query']),
  });
};

class KongSwapService {
  constructor() {
    this.kongActor = null;
    this.icpLedgerActor = null;
    this.agent = null;
  }

  async initialize(identity) {
    // Create agent with user's identity
    this.agent = new HttpAgent({
      identity,
      host: 'https://ic0.app',
    });

    // In development, fetch root key
    if (process.env.NODE_ENV !== 'production') {
      await this.agent.fetchRootKey();
    }

    // Create actors
    this.kongActor = Actor.createActor(kongIdlFactory, {
      agent: this.agent,
      canisterId: KONG_BACKEND_ID,
    });

    this.icpLedgerActor = Actor.createActor(icpLedgerIdlFactory, {
      agent: this.agent,
      canisterId: ICP_LEDGER_ID,
    });
  }

  async getICPBalance(principal) {
    if (!this.icpLedgerActor) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    const account = {
      owner: Principal.fromText(principal),
      subaccount: [],
    };

    const balance = await this.icpLedgerActor.icrc1_balance_of(account);
    return balance;
  }

  async transferICPToKongSwap(amount) {
    if (!this.icpLedgerActor) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    const transferArg = {
      to: {
        owner: Principal.fromText(KONG_BACKEND_ID),
        subaccount: [],
      },
      amount: BigInt(amount),
      fee: [BigInt(10000)], // 0.0001 ICP fee
      memo: [],
      from_subaccount: [],
      created_at_time: [],
    };

    const result = await this.icpLedgerActor.icrc1_transfer(transferArg);
    
    if ('Ok' in result) {
      return { success: true, blockIndex: result.Ok };
    } else {
      return { success: false, error: result.Err };
    }
  }

  async registerWithKongSwap(payAmount = 100000) {
    if (!this.kongActor || !this.icpLedgerActor) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    try {
      // Step 1: Transfer ICP to KongSwap
      const transferResult = await this.transferICPToKongSwap(payAmount);
      
      if (!transferResult.success) {
        throw new Error(`ICP transfer failed: ${JSON.stringify(transferResult.error)}`);
      }

      // Step 2: Call swap with the transfer ID
      const swapArgs = {
        pay_token: 'ICP',
        pay_amount: BigInt(payAmount),
        receive_token: 'ALEX', // Or any token available
        receive_amount: [BigInt(0)], // Accept any amount
        max_slippage: [100.0], // Accept any slippage
        referred_by: [],
        pay_tx_id: [{ BlockIndex: transferResult.blockIndex }],
      };

      const swapResult = await this.kongActor.swap(swapArgs);
      
      if ('Ok' in swapResult) {
        return { 
          success: true, 
          message: `Successfully registered with KongSwap. Swapped ${swapResult.Ok.pay_amount} ${swapResult.Ok.pay_symbol} for ${swapResult.Ok.receive_amount} ${swapResult.Ok.receive_symbol}`,
          data: swapResult.Ok
        };
      } else {
        // Check if already registered
        if (swapResult.Err.includes('User already exists')) {
          return { 
            success: true, 
            message: 'Already registered with KongSwap',
            alreadyRegistered: true
          };
        }
        // Even if swap fails (e.g., "Receive amount is zero"), registration might succeed
        if (swapResult.Err.includes('zero')) {
          return {
            success: true,
            message: 'Registration likely successful (swap returned zero but user should be registered)',
            warning: swapResult.Err
          };
        }
        return { 
          success: false, 
          error: swapResult.Err 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error.message || 'Unknown error occurred' 
      };
    }
  }

  async checkKongSwapBalance(principal) {
    if (!this.kongActor) {
      throw new Error('Service not initialized. Call initialize() first.');
    }

    const result = await this.kongActor.user_balances(principal);
    
    if ('Ok' in result) {
      const lpBalances = result.Ok
        .filter(balance => 'LP' in balance)
        .map(balance => balance.LP);
      return { success: true, balances: lpBalances };
    } else {
      if (result.Err.includes('User not found')) {
        return { success: false, notRegistered: true, error: 'User not registered with KongSwap' };
      }
      return { success: false, error: result.Err };
    }
  }
}

export default new KongSwapService();