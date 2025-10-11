/**
 * @file Core formatting utilities for DAOPad
 * @description Safe BigInt conversions, number formatting, and display utilities
 */

// ============================================================================
// BIGINT UTILITIES
// ============================================================================

/**
 * Safely converts any value to BigInt with fallback
 * @param {any} value - Input value
 * @param {BigInt} [fallback=0n] - Fallback value
 * @returns {BigInt} Normalized BigInt
 */
export function safeBalance(value, fallback = 0n) {
  if (value === null || value === undefined) return fallback;
  if (typeof value === 'bigint') return value;

  try {
    return BigInt(value);
  } catch (error) {
    console.error('Invalid balance value:', value, error);
    return fallback;
  }
}

/**
 * Safely converts BigInt to float with decimal adjustment
 * @param {BigInt|string|number} balance - Raw balance value
 * @param {number} decimals - Token decimal places (e.g., 8 for ICP)
 * @returns {number} Float representation safe for display
 * @example
 * bigintToFloat(500000000n, 8) // Returns 5.0
 * bigintToFloat(0n, 8) // Returns 0
 * bigintToFloat(null, 8) // Returns 0 (safe fallback)
 */
export function bigintToFloat(balance, decimals = 8) {
  // 1. Validate and normalize input
  const safeBigInt = safeBalance(balance);

  // 2. Convert BigInt to Number
  // For large values, use division to prevent overflow
  // Example: 500000000n / 100000000n = 5n, then Number(5n) = 5
  const divisor = BigInt(Math.pow(10, decimals));
  const wholePart = Number(safeBigInt / divisor);
  const fractionalPart = Number(safeBigInt % divisor) / Math.pow(10, decimals);

  return wholePart + fractionalPart;
}

/**
 * Counts significant decimal places in a float
 * @private
 * @param {number} value - Numeric value
 * @returns {number} Number of significant decimal places
 */
function countSignificantDecimals(value) {
  const str = value.toString();
  const decimalIndex = str.indexOf('.');
  if (decimalIndex === -1) return 0;

  // Count trailing non-zero decimals
  const decimals = str.slice(decimalIndex + 1);
  let count = 0;
  for (let i = decimals.length - 1; i >= 0; i--) {
    if (decimals[i] !== '0') {
      count = i + 1;
      break;
    }
  }
  return count;
}

/**
 * Formats number in compact notation (1.2M, 500K)
 * @param {number} value - Numeric value
 * @returns {string} Compact representation
 */
function formatCompactNumber(value) {
  const absValue = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (absValue >= 1_000_000_000) {
    return `${sign}${(absValue / 1_000_000_000).toFixed(1)}B`;
  }
  if (absValue >= 1_000_000) {
    return `${sign}${(absValue / 1_000_000).toFixed(1)}M`;
  }
  if (absValue >= 1_000) {
    return `${sign}${(absValue / 1_000).toFixed(1)}K`;
  }
  return value.toString();
}

/**
 * Formats balance for display with symbol and options
 * @param {BigInt|string|number} balance - Raw balance value
 * @param {number} decimals - Token decimal places
 * @param {Object} [options] - Formatting options
 * @param {string} [options.symbol] - Token symbol (e.g., "ICP")
 * @param {number} [options.maxDecimals=4] - Max decimal places to show
 * @param {number} [options.minDecimals=2] - Min decimal places to show
 * @param {boolean} [options.compact=false] - Use compact notation (1.2M)
 * @returns {string} Formatted balance string
 * @example
 * formatBalance(500000000n, 8, { symbol: 'ICP' }) // "5.00 ICP"
 * formatBalance(1500000000000000n, 8, { compact: true }) // "15M"
 */
export function formatBalance(balance, decimals = 8, options = {}) {
  const {
    symbol = '',
    maxDecimals = 4,
    minDecimals = 2,
    compact = false,
  } = options;

  // 1. Convert to float
  const floatValue = bigintToFloat(balance, decimals);

  // 2. Handle compact notation for large numbers
  if (compact && floatValue >= 1_000_000) {
    return formatCompactNumber(floatValue) + (symbol ? ` ${symbol}` : '');
  }

  // 3. Format with fixed decimals
  const decimalPlaces = floatValue === 0 ? minDecimals : Math.min(maxDecimals, Math.max(minDecimals, countSignificantDecimals(floatValue)));
  const formatted = floatValue.toFixed(decimalPlaces);

  // 4. Add symbol
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Parses user input (string) to BigInt for backend
 * @param {string} input - User-entered amount
 * @param {number} decimals - Token decimal places
 * @returns {BigInt} Balance in smallest unit
 * @throws {Error} If input is invalid
 * @example
 * parseBalanceInput("5.5", 8) // Returns 550000000n
 */
export function parseBalanceInput(input, decimals = 8) {
  // 1. Validate input
  const cleaned = input.trim();
  if (!cleaned || isNaN(cleaned)) {
    throw new Error('Invalid balance input');
  }

  // 2. Reject scientific notation
  if (cleaned.toLowerCase().includes('e')) {
    throw new Error('Scientific notation is not supported');
  }

  // 3. Validate only one decimal point
  const decimalCount = (cleaned.match(/\./g) || []).length;
  if (decimalCount > 1) {
    throw new Error('Multiple decimal points are not allowed');
  }

  // 4. Split into whole and fractional parts
  const [whole = '0', fractional = '0'] = cleaned.split('.');

  // 5. Validate decimal places don't exceed token decimals
  if (fractional.length > decimals) {
    throw new Error(`Too many decimal places (max ${decimals})`);
  }

  // 6. Build BigInt
  const paddedFractional = fractional.padEnd(decimals, '0');
  const combined = whole + paddedFractional;

  return BigInt(combined);
}

/**
 * Validates balance value
 * @param {any} value - Value to check
 * @returns {boolean} True if valid balance
 */
export function isValidBalance(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'bigint') return value >= 0n;
  if (typeof value === 'number') return value >= 0 && !isNaN(value);
  if (typeof value === 'string') {
    try {
      const bigIntValue = BigInt(value);
      return bigIntValue >= 0n;
    } catch {
      return false;
    }
  }
  return false;
}

// ============================================================================
// OTHER FORMAT UTILITIES
// ============================================================================

/**
 * Formats IC timestamp (nanoseconds) to readable date
 * @param {BigInt|string|number} nanos - IC timestamp in nanoseconds
 * @returns {string} Formatted date string
 */
export function formatDateTime(nanos) {
  if (!nanos) return 'N/A';

  try {
    // Convert nanoseconds to milliseconds
    const ms = Number(BigInt(nanos) / 1_000_000n);
    const date = new Date(ms);

    // Format: "Jan 1, 2024 12:00 PM"
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting timestamp:', nanos, error);
    return 'Invalid Date';
  }
}

/**
 * Shortens principal ID for display
 * @param {string} principal - Full principal ID
 * @param {number} [start=8] - Characters to show at start
 * @param {number} [end=6] - Characters to show at end
 * @returns {string} Shortened principal
 * @example
 * formatPrincipalShort("ryjl3-tyaaa-aaaaa-aaaba-cai") // "ryjl3-ty...aba-cai"
 */
export function formatPrincipalShort(principal, start = 8, end = 6) {
  if (!principal || principal.length <= start + end) return principal || '';
  return `${principal.slice(0, start)}...${principal.slice(-end)}`;
}

/**
 * Formats blockchain address (similar to principal)
 * @param {string} address - Full address
 * @param {number} [start=10] - Characters to show at start
 * @param {number} [end=8] - Characters to show at end
 * @returns {string} Shortened address
 */
export function formatAddress(address, start = 10, end = 8) {
  return formatPrincipalShort(address, start, end);
}
