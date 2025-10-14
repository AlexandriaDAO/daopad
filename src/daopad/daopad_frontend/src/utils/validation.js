/**
 * UUID v4 validation regex
 */
export const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate if string is a valid UUID v4
 * @param {string} str - String to validate
 * @returns {boolean} True if valid UUID
 */
export const isValidUUID = (str) => {
  return typeof str === 'string' && UUID_REGEX.test(str);
};

/**
 * Validate multiple UUIDs and throw descriptive error
 * @param {Object} uuids - Object with field names as keys and UUIDs as values
 * @throws {Error} If any UUID is invalid
 */
export const validateUUIDs = (uuids) => {
  const invalid = [];

  for (const [field, uuid] of Object.entries(uuids)) {
    if (!isValidUUID(uuid)) {
      invalid.push(`${field}: '${uuid}'`);
    }
  }

  if (invalid.length > 0) {
    throw new Error(`Invalid UUID format for: ${invalid.join(', ')}`);
  }
};