import {
  bigintToFloat,
  formatBalance,
  parseBalanceInput,
  isValidBalance,
  safeBalance,
  formatDateTime,
  formatPrincipalShort,
  formatAddress,
} from './format';

describe('bigintToFloat', () => {
  test('converts ICP balance (8 decimals)', () => {
    expect(bigintToFloat(100000000n, 8)).toBe(1.0);
    expect(bigintToFloat(500000000n, 8)).toBe(5.0);
    expect(bigintToFloat(550000000n, 8)).toBe(5.5);
  });

  test('handles zero balance', () => {
    expect(bigintToFloat(0n, 8)).toBe(0);
  });

  test('handles smallest unit (1 e8s)', () => {
    expect(bigintToFloat(1n, 8)).toBe(0.00000001);
  });

  test('handles large balances without overflow', () => {
    const trillion = 1000000000000000000n; // 10 billion ICP
    expect(bigintToFloat(trillion, 8)).toBe(10000000000);
  });

  test('handles invalid inputs with fallback', () => {
    expect(bigintToFloat(null, 8)).toBe(0);
    expect(bigintToFloat(undefined, 8)).toBe(0);
    expect(bigintToFloat('', 8)).toBe(0);
  });

  test('handles string inputs', () => {
    expect(bigintToFloat('100000000', 8)).toBe(1.0);
  });

  test('handles different decimal places', () => {
    expect(bigintToFloat(1000000000000000000n, 18)).toBe(1.0); // ERC-20 style
  });
});

describe('formatBalance', () => {
  test('formats with symbol', () => {
    expect(formatBalance(500000000n, 8, { symbol: 'ICP' })).toBe('5.00 ICP');
  });

  test('formats without symbol', () => {
    expect(formatBalance(500000000n, 8)).toBe('5.00');
  });

  test('respects maxDecimals option', () => {
    const result = formatBalance(555555555n, 8, { maxDecimals: 2 });
    expect(result).toMatch(/5\.5[56]/); // Allow for rounding variations
  });

  test('uses compact notation for large numbers', () => {
    expect(formatBalance(1500000000000000n, 8, { compact: true })).toMatch(/15\.0M/);
  });

  test('handles zero balance', () => {
    expect(formatBalance(0n, 8, { symbol: 'ICP' })).toBe('0.00 ICP');
  });

  test('handles invalid inputs gracefully', () => {
    expect(formatBalance(null, 8, { symbol: 'ICP' })).toBe('0.00 ICP');
  });

  test('formats small decimals correctly', () => {
    expect(formatBalance(12345678n, 8, { symbol: 'ICP' })).toBe('0.1235 ICP');
  });
});

describe('parseBalanceInput', () => {
  test('parses integer input', () => {
    expect(parseBalanceInput('5', 8)).toBe(500000000n);
  });

  test('parses decimal input', () => {
    expect(parseBalanceInput('5.5', 8)).toBe(550000000n);
    expect(parseBalanceInput('0.00000001', 8)).toBe(1n);
  });

  test('handles max decimals', () => {
    expect(parseBalanceInput('5.12345678', 8)).toBe(512345678n);
  });

  test('throws on too many decimals', () => {
    expect(() => parseBalanceInput('5.123456789', 8)).toThrow(/Too many decimal places/);
  });

  test('throws on invalid input', () => {
    expect(() => parseBalanceInput('', 8)).toThrow(/Invalid balance input/);
    expect(() => parseBalanceInput('abc', 8)).toThrow(/Invalid balance input/);
  });

  test('handles whitespace', () => {
    expect(parseBalanceInput('  5.5  ', 8)).toBe(550000000n);
  });

  test('handles zero values', () => {
    expect(parseBalanceInput('0', 8)).toBe(0n);
    expect(parseBalanceInput('0.0', 8)).toBe(0n);
  });
});

describe('isValidBalance', () => {
  test('validates BigInt', () => {
    expect(isValidBalance(100n)).toBe(true);
    expect(isValidBalance(0n)).toBe(true);
    expect(isValidBalance(-1n)).toBe(false); // Negative not valid
  });

  test('validates numbers', () => {
    expect(isValidBalance(100)).toBe(true);
    expect(isValidBalance(0)).toBe(true);
    expect(isValidBalance(-1)).toBe(false);
    expect(isValidBalance(NaN)).toBe(false);
  });

  test('validates strings', () => {
    expect(isValidBalance('100')).toBe(true);
    expect(isValidBalance('abc')).toBe(false);
  });

  test('rejects null/undefined', () => {
    expect(isValidBalance(null)).toBe(false);
    expect(isValidBalance(undefined)).toBe(false);
  });
});

describe('safeBalance', () => {
  test('returns BigInt as-is', () => {
    expect(safeBalance(100n)).toBe(100n);
  });

  test('converts valid strings', () => {
    expect(safeBalance('100')).toBe(100n);
  });

  test('returns fallback for invalid', () => {
    expect(safeBalance(null)).toBe(0n);
    expect(safeBalance(undefined)).toBe(0n);
    expect(safeBalance('abc')).toBe(0n);
  });

  test('respects custom fallback', () => {
    expect(safeBalance(null, 999n)).toBe(999n);
  });
});

describe('formatDateTime', () => {
  test('converts IC nanoseconds to date', () => {
    // Jan 1, 2024, 00:00:00 UTC = 1704067200000 ms
    const nanos = BigInt(1704067200000) * 1_000_000n;
    const formatted = formatDateTime(nanos);
    expect(formatted).toMatch(/Jan 1, 2024/);
  });

  test('handles current timestamp', () => {
    const now = BigInt(Date.now()) * 1_000_000n;
    const formatted = formatDateTime(now);
    expect(formatted).toBeTruthy();
    expect(formatted).toMatch(/202[0-9]/); // Year 2020+
  });

  test('handles null/undefined', () => {
    expect(formatDateTime(null)).toBe('N/A');
    expect(formatDateTime(undefined)).toBe('N/A');
  });

  test('handles invalid timestamps', () => {
    expect(formatDateTime('invalid')).toBe('Invalid Date');
  });
});

describe('formatPrincipalShort', () => {
  test('shortens long principal', () => {
    const principal = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
    const short = formatPrincipalShort(principal);
    expect(short).toBe('ryjl3-ty...aba-cai');
  });

  test('returns short principal as-is', () => {
    const principal = 'abc-def';
    expect(formatPrincipalShort(principal)).toBe(principal);
  });

  test('respects custom start/end', () => {
    const principal = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
    const short = formatPrincipalShort(principal, 4, 4);
    expect(short).toBe('ryjl...-cai');
  });

  test('handles null/undefined', () => {
    expect(formatPrincipalShort(null)).toBe('');
    expect(formatPrincipalShort(undefined)).toBe('');
  });
});

describe('formatAddress', () => {
  test('formats address with default params', () => {
    const address = 'ryjl3-tyaaa-aaaaa-aaaba-cai-extended-long';
    const formatted = formatAddress(address);
    expect(formatted).toBe('ryjl3-tyaa...ded-long');
  });

  test('uses custom start/end params', () => {
    const address = 'ryjl3-tyaaa-aaaaa-aaaba-cai';
    const formatted = formatAddress(address, 5, 5);
    expect(formatted).toBe('ryjl3...a-cai');
  });
});
