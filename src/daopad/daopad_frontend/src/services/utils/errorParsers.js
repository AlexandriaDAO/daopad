/**
 * Parse Orbit's double-wrapped Result format
 * Orbit returns: Result::Ok(Result::Ok(T)) or Result::Ok(Result::Err(E))
 */
export const parseOrbitResult = (response) => {
  // Check for outer Result
  if (response?.Ok) {
    // Check inner Result
    if (response.Ok.Ok !== undefined) {
      return { success: true, data: response.Ok.Ok };
    } else if (response.Ok.Err !== undefined) {
      const errorMessage = formatOrbitError(response.Ok.Err);
      return { success: false, error: errorMessage };
    }
  } else if (response?.Err) {
    const errorMessage = formatOrbitError(response.Err);
    return { success: false, error: errorMessage };
  }

  // Fallback for simple format
  if (response?.success !== undefined) {
    return response;
  }

  return { success: false, error: 'Invalid response structure' };
};

/**
 * Format Orbit error objects into readable messages
 */
export const formatOrbitError = (errorRecord) => {
  if (!errorRecord || typeof errorRecord !== 'object') {
    return 'Orbit Station error';
  }

  // Get error message
  const message = Array.isArray(errorRecord.message) && errorRecord.message.length > 0
    ? errorRecord.message[0]
    : errorRecord.code || 'Unknown error';

  // Get error details
  const detailsVector = Array.isArray(errorRecord.details) && errorRecord.details.length > 0
    ? errorRecord.details[0]
    : [];

  if (Array.isArray(detailsVector) && detailsVector.length > 0) {
    const rendered = detailsVector
      .map((entry) => {
        if (Array.isArray(entry) && entry.length === 2) {
          const [key, value] = entry;
          return `${key}: ${value}`;
        }
        if (entry && typeof entry === 'object') {
          const keys = Object.keys(entry);
          if (keys.length === 2) {
            return keys.map((k) => `${k}: ${entry[k]}`).join(', ');
          }
        }
        return null;
      })
      .filter(Boolean)
      .join('; ');

    if (rendered) {
      return `${message} (${rendered})`;
    }
  }

  return message || 'Orbit Station error';
};
