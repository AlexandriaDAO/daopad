import {
  selectFormattedAccounts,
  selectFormattedAccountById,
  selectAccountsWithMinBalance,
  selectTotalBalance,
  selectAccountsSortedByBalance,
  selectAccountsSortedByName,
  selectHasAnyBalance,
} from './orbitSelectors';

// Mock state
const mockState = {
  orbit: {
    accounts: {
      data: {
        'station-1': {
          accounts: [
            { id: 'acc-1', name: 'Main Account' },
            { id: 'acc-2', name: 'Reserve Account' },
            { id: 'acc-3', name: 'Empty Account' },
          ],
          total: 3,
          balances: {
            'acc-1': {
              account_id: 'acc-1',
              asset_id: 'ICP',
              balance: 500000000n,
              decimals: 8,
              last_update_timestamp: '2024-01-01T00:00:00Z',
              query_state: 'fresh',
            },
            'acc-2': {
              account_id: 'acc-2',
              asset_id: 'ICP',
              balance: 1000000000n,
              decimals: 8,
              last_update_timestamp: '2024-01-01T00:00:00Z',
              query_state: 'fresh',
            },
            // acc-3 has no balance
          },
        },
      },
      loading: {},
      error: {},
      lastFetch: {},
    },
    assets: {
      data: {
        'ICP': { symbol: 'ICP' },
      },
    },
  },
};

describe('selectFormattedAccounts', () => {
  test('formats all accounts with balances', () => {
    const result = selectFormattedAccounts(mockState, 'station-1', 'ICP');

    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      id: 'acc-1',
      balanceFloat: 5.0,
      balanceFormatted: '5.00 ICP',
    });
    expect(result[1]).toMatchObject({
      id: 'acc-2',
      balanceFloat: 10.0,
      balanceFormatted: '10.00 ICP',
    });
  });

  test('handles missing balances gracefully', () => {
    const result = selectFormattedAccounts(mockState, 'station-1', 'ICP');
    const emptyAccount = result.find(acc => acc.id === 'acc-3');

    expect(emptyAccount).toBeDefined();
    expect(emptyAccount.balanceFormatted).toBe('N/A');
    expect(emptyAccount.balanceFloat).toBe(0);
  });

  test('handles missing station data', () => {
    const result = selectFormattedAccounts(mockState, 'nonexistent-station', 'ICP');
    expect(result).toEqual([]);
  });

  test('memoizes results (returns same reference for same inputs)', () => {
    const result1 = selectFormattedAccounts(mockState, 'station-1', 'ICP');
    const result2 = selectFormattedAccounts(mockState, 'station-1', 'ICP');

    // Should return same reference (memoized)
    expect(result1).toBe(result2);
  });

  test('recalculates when inputs change', () => {
    const result1 = selectFormattedAccounts(mockState, 'station-1', 'ICP');
    const result2 = selectFormattedAccounts(mockState, 'station-1', 'BTC');

    // Should return different reference (different symbol)
    expect(result1).not.toBe(result2);
  });
});

describe('selectFormattedAccountById', () => {
  test('returns specific account by ID', () => {
    const result = selectFormattedAccountById(mockState, 'station-1', 'acc-1', 'ICP');

    expect(result).toMatchObject({
      id: 'acc-1',
      name: 'Main Account',
      balanceFormatted: '5.00 ICP',
    });
  });

  test('returns null for non-existent account', () => {
    const result = selectFormattedAccountById(mockState, 'station-1', 'nonexistent', 'ICP');
    expect(result).toBeNull();
  });

  test('returns account without balance', () => {
    const result = selectFormattedAccountById(mockState, 'station-1', 'acc-3', 'ICP');
    expect(result).toMatchObject({
      id: 'acc-3',
      balanceFormatted: 'N/A',
    });
  });
});

describe('selectAccountsWithMinBalance', () => {
  test('filters accounts by minimum balance', () => {
    const result = selectAccountsWithMinBalance(mockState, 'station-1', 'ICP', 6);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('acc-2'); // Only acc-2 has balance >= 6
  });

  test('returns all accounts when min balance is 0', () => {
    const result = selectAccountsWithMinBalance(mockState, 'station-1', 'ICP', 0);

    expect(result.length).toBeGreaterThanOrEqual(2); // acc-1 and acc-2
  });

  test('returns empty array when threshold too high', () => {
    const result = selectAccountsWithMinBalance(mockState, 'station-1', 'ICP', 1000);

    expect(result).toHaveLength(0);
  });

  test('returns all accounts when minBalance is undefined', () => {
    const result = selectAccountsWithMinBalance(mockState, 'station-1', 'ICP', undefined);

    expect(result).toHaveLength(3);
  });
});

describe('selectTotalBalance', () => {
  test('calculates total balance across all accounts', () => {
    const result = selectTotalBalance(mockState, 'station-1', 'ICP');

    expect(result.total).toBe(15.0); // 5 + 10
    expect(result.formatted).toMatch(/15\.00/);
  });

  test('handles station with no accounts', () => {
    const result = selectTotalBalance(mockState, 'nonexistent', 'ICP');

    expect(result.total).toBe(0);
  });

  test('returns bigint representation', () => {
    const result = selectTotalBalance(mockState, 'station-1', 'ICP');

    expect(typeof result.bigint).toBe('bigint');
    expect(result.bigint).toBe(1500000000n); // 15 ICP in e8s
  });
});

describe('selectAccountsSortedByBalance', () => {
  test('sorts accounts by balance descending', () => {
    const result = selectAccountsSortedByBalance(mockState, 'station-1', 'ICP');

    expect(result[0].id).toBe('acc-2'); // 10 ICP
    expect(result[1].id).toBe('acc-1'); // 5 ICP
  });

  test('handles accounts without balances', () => {
    const result = selectAccountsSortedByBalance(mockState, 'station-1', 'ICP');

    // Empty account should be last
    expect(result[result.length - 1].id).toBe('acc-3');
  });

  test('returns new array (doesn\'t mutate original)', () => {
    const formatted = selectFormattedAccounts(mockState, 'station-1', 'ICP');
    const sorted = selectAccountsSortedByBalance(mockState, 'station-1', 'ICP');

    expect(sorted).not.toBe(formatted);
  });
});

describe('selectAccountsSortedByName', () => {
  test('sorts accounts by name alphabetically', () => {
    const result = selectAccountsSortedByName(mockState, 'station-1', 'ICP');

    expect(result[0].name).toBe('Empty Account');
    expect(result[1].name).toBe('Main Account');
    expect(result[2].name).toBe('Reserve Account');
  });

  test('handles case-insensitive sorting', () => {
    const stateWithMixedCase = {
      orbit: {
        accounts: {
          data: {
            'station-1': {
              accounts: [
                { id: 'acc-1', name: 'zebra Account' },
                { id: 'acc-2', name: 'Apple Account' },
              ],
              balances: {},
            },
          },
        },
      },
    };

    const result = selectAccountsSortedByName(stateWithMixedCase, 'station-1', 'ICP');

    expect(result[0].name).toBe('Apple Account');
    expect(result[1].name).toBe('zebra Account');
  });
});

describe('selectHasAnyBalance', () => {
  test('returns true when at least one account has balance', () => {
    const result = selectHasAnyBalance(mockState, 'station-1', 'ICP');

    expect(result).toBe(true);
  });

  test('returns false when no accounts have balance', () => {
    const stateWithoutBalances = {
      orbit: {
        accounts: {
          data: {
            'station-1': {
              accounts: [
                { id: 'acc-1', name: 'Empty Account' },
              ],
              balances: {},
            },
          },
        },
      },
    };

    const result = selectHasAnyBalance(stateWithoutBalances, 'station-1', 'ICP');

    expect(result).toBe(false);
  });

  test('returns false for empty station', () => {
    const result = selectHasAnyBalance(mockState, 'nonexistent', 'ICP');

    expect(result).toBe(false);
  });
});
