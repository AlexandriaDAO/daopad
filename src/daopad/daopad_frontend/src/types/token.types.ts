import { Principal } from '@dfinity/principal';

// Token types
export interface Token {
  canister_id: string | Principal;
  symbol: string;
  name: string;
  decimals?: number;
  fee?: bigint | number;
  logo?: string;
  total_supply?: bigint | number;
}

export interface TokenMetadata {
  symbol: string;
  name: string;
  decimals: number;
  fee: bigint;
  logo?: string;
  total_supply?: bigint;
}
