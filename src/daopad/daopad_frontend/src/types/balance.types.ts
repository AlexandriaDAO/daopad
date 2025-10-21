import { Principal } from '@dfinity/principal';

/**
 * Token balance information
 * Used for displaying account balances in the UI
 */
export interface Balance {
  token: Principal | string;
  amount: bigint;
  decimals: number;
  symbol: string;
  name?: string;
}

/**
 * Raw account balance from backend
 * @description Orbit Station account balance response
 */
export interface RawAccountBalance {
  account_id: string;
  asset_id: string;
  balance: bigint;
  decimals: number;
  last_update_timestamp: string;
  query_state: 'fresh' | 'stale' | 'stale_refreshing';
}

/**
 * Formatted account balance for display
 * @description Processed balance with human-readable formatting
 */
export interface FormattedAccountBalance {
  account_id: string;
  asset_id: string;
  balance: bigint;
  balanceFloat: number;
  balanceFormatted: string;
  decimals: number;
  last_update_timestamp: string;
  query_state: string;
}

/**
 * Balance formatting options
 */
export interface FormatOptions {
  symbol?: string;
  maxDecimals?: number;
  minDecimals?: number;
  compact?: boolean;
}
