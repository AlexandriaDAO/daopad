/**
 * @file Type definitions for balance handling
 * @description JSDoc types for BigInt balance operations
 */

/**
 * Raw account balance from backend
 * @typedef {Object} RawAccountBalance
 * @property {string} account_id - UUID of account
 * @property {string} asset_id - UUID of asset
 * @property {BigInt} balance - Raw balance (from candid::Nat)
 * @property {number} decimals - Token decimal places
 * @property {string} last_update_timestamp - RFC3339 timestamp
 * @property {string} query_state - "fresh", "stale", or "stale_refreshing"
 */

/**
 * Formatted account balance for display
 * @typedef {Object} FormattedAccountBalance
 * @property {string} account_id
 * @property {string} asset_id
 * @property {BigInt} balance - Keep raw for recalculations
 * @property {number} balanceFloat - For sorting/comparisons
 * @property {string} balanceFormatted - For display (e.g., "5.00 ICP")
 * @property {number} decimals
 * @property {string} last_update_timestamp
 * @property {string} query_state
 */

/**
 * Balance formatting options
 * @typedef {Object} FormatOptions
 * @property {string} [symbol] - Token symbol (e.g., "ICP")
 * @property {number} [maxDecimals=4] - Max decimal places
 * @property {number} [minDecimals=2] - Min decimal places
 * @property {boolean} [compact=false] - Use compact notation (1.2M)
 */

// Export types (for JSDoc @type imports)
export {};
