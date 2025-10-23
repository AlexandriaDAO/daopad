/**
 * Safely converts Principal objects to strings for React rendering
 *
 * @dfinity/principal objects cannot be rendered directly in React.
 * This utility handles conversion to string representation.
 */

/**
 * Convert a Principal object or any value to a string
 * Handles:
 * - Principal objects (with _isPrincipal or toText method)
 * - String values (pass through)
 * - Null/undefined (return empty string)
 * - Other values (convert to string)
 */
export function principalToString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;

  // Check for Principal object by _isPrincipal property
  if (typeof value === 'object' && value._isPrincipal) {
    return value.toText();
  }

  // Check for toText method (alternative check)
  if (typeof value === 'object' && typeof value.toText === 'function') {
    return value.toText();
  }

  return String(value);
}

/**
 * Normalize a canister object by converting all Principal fields to strings
 * This is useful before passing canister data to React components
 */
export function normalizeCanisterForReact(canister: any): any {
  if (!canister) return canister;

  return {
    ...canister,
    id: principalToString(canister.id),
    canister_id: principalToString(canister.canister_id),
  };
}
