/**
 * @file Redux selectors for Orbit data with memoization
 * @description Memoized selectors that format balances and derived data
 */

import { createSelector } from '@reduxjs/toolkit';
import { formatBalance, bigintToFloat } from '@/utils/format';

// ============================================================================
// BASE SELECTORS
// ============================================================================

/**
 * Base selector for accounts state
 * @param {Object} state - Redux state
 * @param {string} stationId - Station ID
 * @returns {Object} Accounts data for station
 */
const selectAccountsData = (state, stationId) =>
  state.orbit.accounts.data[stationId] || { accounts: [], total: 0, balances: {} };

/**
 * Base selector for assets (if available in state)
 * @param {Object} state - Redux state
 * @returns {Object} Assets mapping
 */
const selectAssets = (state) =>
  state.orbit.assets?.data || {};

// ============================================================================
// MEMOIZED SELECTORS
// ============================================================================

/**
 * Memoized selector that formats all account balances for a station
 * @param {Object} state - Redux state
 * @param {string} stationId - Station ID
 * @param {string} tokenSymbol - Token symbol for formatting
 * @returns {Array<FormattedAccountBalance>} Accounts with formatted balances
 * @example
 * const accounts = useSelector(state => selectFormattedAccounts(state, stationId, 'ICP'));
 * accounts.forEach(acc => console.log(acc.balanceFormatted)); // "5.00 ICP"
 */
export const selectFormattedAccounts = createSelector(
  [selectAccountsData, (state, stationId, tokenSymbol) => tokenSymbol],
  (accountsData, tokenSymbol) => {
    const { accounts, balances } = accountsData;

    if (!accounts || accounts.length === 0) {
      return [];
    }

    return accounts.map(account => {
      const balanceData = balances?.[account.id];

      // Debug logging - remove after fixing
      console.log('[orbitSelector] Processing account:', {
        accountId: account.id,
        accountName: account.name,
        hasBalanceData: !!balanceData,
        balanceDataKeys: balanceData ? Object.keys(balanceData) : [],
        accountAssets: account.assets
      });

      if (!balanceData) {
        return {
          ...account,
          balanceFloat: 0,
          balanceFormatted: 'N/A',
        };
      }

      // Convert to float for sorting
      const balanceFloat = bigintToFloat(
        balanceData.balance,
        balanceData.decimals || 8
      );

      // Format for display
      const balanceFormatted = formatBalance(
        balanceData.balance,
        balanceData.decimals || 8,
        { symbol: tokenSymbol || '' }
      );

      // Build assets array from balance data
      // Strategy: Try to use existing assets, otherwise construct from balance data
      const existingAssets = account.assets || [];

      let assetsWithBalance;

      if (existingAssets.length > 0) {
        // Use existing assets from account
        assetsWithBalance = existingAssets.map(asset => ({
          ...asset,
          balance: balanceData.balance,
          decimals: asset.decimals || balanceData.decimals || 8
        }));
      } else {
        // Construct asset from balance data
        // Use asset_id if available, otherwise use metadata_id or generate from account
        const assetId = balanceData.asset_id ||
                       balanceData.metadata_id ||
                       account.metadata?.asset_id ||
                       `asset-${account.id}`; // Fallback ID

        assetsWithBalance = [{
          id: assetId,
          symbol: balanceData.symbol || tokenSymbol || 'TOKEN',
          decimals: balanceData.decimals || 8,
          balance: balanceData.balance,
          blockchain: balanceData.blockchain || account.blockchain || 'InternetComputer'
        }];
      }

      console.log('[orbitSelector] Constructed assets:', assetsWithBalance);

      return {
        ...account,
        balance: balanceData.balance, // Keep raw BigInt
        decimals: balanceData.decimals || 8,
        balanceFloat,
        balanceFormatted,
        assets: assetsWithBalance, // Ensure assets array is populated
      };
    });
  }
);

/**
 * Selector for a single account by ID
 * @param {Object} state - Redux state
 * @param {string} stationId - Station ID
 * @param {string} accountId - Account ID
 * @param {string} tokenSymbol - Token symbol
 * @returns {FormattedAccountBalance|null} Formatted account or null
 */
export const selectFormattedAccountById = createSelector(
  [
    (state, stationId, accountId, tokenSymbol) =>
      selectFormattedAccounts(state, stationId, tokenSymbol),
    (state, stationId, accountId) => accountId
  ],
  (accounts, accountId) => {
    return accounts.find(acc => acc.id === accountId) || null;
  }
);

/**
 * Selector for accounts with balance greater than threshold
 * Useful for transfer dialogs (only show funded accounts)
 * @param {Object} state - Redux state
 * @param {string} stationId - Station ID
 * @param {string} tokenSymbol - Token symbol
 * @param {number} minBalance - Minimum balance (as float)
 * @returns {Array<FormattedAccountBalance>} Filtered accounts
 */
export const selectAccountsWithMinBalance = createSelector(
  [
    (state, stationId, tokenSymbol, minBalance) =>
      selectFormattedAccounts(state, stationId, tokenSymbol),
    (state, stationId, tokenSymbol, minBalance) => minBalance
  ],
  (accounts, minBalance) => {
    if (minBalance === undefined || minBalance === null) {
      return accounts;
    }
    return accounts.filter(acc => acc.balanceFloat >= minBalance);
  }
);

/**
 * Selector for total balance across all accounts for a station
 * @param {Object} state - Redux state
 * @param {string} stationId - Station ID
 * @param {string} tokenSymbol - Token symbol for formatting
 * @returns {Object} Total balance info
 */
export const selectTotalBalance = createSelector(
  [(state, stationId, tokenSymbol) => selectFormattedAccounts(state, stationId, tokenSymbol)],
  (accounts) => {
    // Use first account's decimals (assuming same asset)
    const decimals = accounts[0]?.decimals || 8;

    // Sum raw BigInt values directly to avoid precision loss
    const totalBigInt = accounts.reduce((sum, acc) => sum + (acc.balance || 0n), 0n);

    // Convert to float only for display
    const total = bigintToFloat(totalBigInt, decimals);

    const formatted = formatBalance(totalBigInt, decimals, {
      symbol: accounts[0]?.balanceFormatted?.split(' ')[1] || ''
    });

    return {
      total: total,
      formatted: formatted,
      bigint: totalBigInt,
    };
  }
);

/**
 * Selector for accounts sorted by balance (descending)
 * @param {Object} state - Redux state
 * @param {string} stationId - Station ID
 * @param {string} tokenSymbol - Token symbol
 * @returns {Array<FormattedAccountBalance>} Sorted accounts
 */
export const selectAccountsSortedByBalance = createSelector(
  [(state, stationId, tokenSymbol) => selectFormattedAccounts(state, stationId, tokenSymbol)],
  (accounts) => {
    return [...accounts].sort((a, b) => (b.balanceFloat || 0) - (a.balanceFloat || 0));
  }
);

/**
 * Selector for accounts sorted by name
 * @param {Object} state - Redux state
 * @param {string} stationId - Station ID
 * @param {string} tokenSymbol - Token symbol
 * @returns {Array<FormattedAccountBalance>} Sorted accounts
 */
export const selectAccountsSortedByName = createSelector(
  [(state, stationId, tokenSymbol) => selectFormattedAccounts(state, stationId, tokenSymbol)],
  (accounts) => {
    return [...accounts].sort((a, b) => {
      const nameA = (a.name || '').toLowerCase();
      const nameB = (b.name || '').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  }
);

/**
 * Selector to check if any account has a balance
 * @param {Object} state - Redux state
 * @param {string} stationId - Station ID
 * @param {string} tokenSymbol - Token symbol
 * @returns {boolean} True if any account has balance > 0
 */
export const selectHasAnyBalance = createSelector(
  [(state, stationId, tokenSymbol) => selectFormattedAccounts(state, stationId, tokenSymbol)],
  (accounts) => {
    return accounts.some(acc => acc.balanceFloat > 0);
  }
);
