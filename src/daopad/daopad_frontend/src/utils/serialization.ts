/**
 * Helper utilities to convert BigInt values to JSON-serialisable forms
 * and restore them back when needed.
 */
export const BIGINT_FIELDS = new Set([
  'balance',
  'total',
  'yes_votes',
  'no_votes',
  'created_at',
  'expires_at',
  'offset',
  'limit',
]);

export function toSerializable(value) {
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (Array.isArray(value)) {
    return value.map(toSerializable);
  }
  if (value && typeof value === 'object') {
    const result = {};
    for (const [key, entry] of Object.entries(value)) {
      result[key] = toSerializable(entry);
    }
    return result;
  }
  return value;
}

export function reviveBigInts(obj) {
  if (Array.isArray(obj)) {
    return obj.map(reviveBigInts);
  }
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(obj)) {
      result[key] = maybeStringToBigInt(key, value);
    }
    return result;
  }
  return obj;
}

function maybeStringToBigInt(key, value) {
  if (typeof value === 'string' && BIGINT_FIELDS.has(key) && /^\d+$/.test(value)) {
    try {
      return BigInt(value);
    } catch {
      return value;
    }
  }
  if (Array.isArray(value)) {
    return value.map((item) => maybeStringToBigInt(key, item));
  }
  if (value && typeof value === 'object') {
    const nested = {};
    for (const [nestedKey, nestedValue] of Object.entries(value)) {
      nested[nestedKey] = maybeStringToBigInt(nestedKey, nestedValue);
    }
    return nested;
  }
  return value;
}
