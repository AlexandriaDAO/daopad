/**
 * Safely stringify objects containing BigInt values
 * @param {any} obj - Object to stringify
 * @param {number} space - Indentation spacing
 * @returns {string} JSON string with BigInts converted to strings
 */
export const safeStringify = (obj, space = 2) => {
  return JSON.stringify(
    obj,
    (key, value) => typeof value === 'bigint' ? value.toString() + 'n' : value,
    space
  );
};

/**
 * Conditional debug logging
 * @param {string} group - Console group name
 * @param {Function} logFn - Function containing console.log statements
 */
export const debugLog = (group, logFn) => {
  if (import.meta.env.DEV || localStorage.getItem('DEBUG_MODE')) {
    console.group(group);
    logFn();
    console.groupEnd();
  }
};