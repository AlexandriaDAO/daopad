/**
 * OrbitServiceBase - Base class for all Orbit-related services
 * Provides common patterns for encoding optional fields, error handling, and response parsing
 * Based on patterns from addressBookService, orbitStationService, and balanceService
 */
export class OrbitServiceBase {
  constructor(actor, serviceName) {
    this.actor = actor;
    this.serviceName = serviceName;
    this.cache = new Map();
    this.cacheTimeout = 5000; // 5 seconds default
  }

  /**
   * Common encoding for optional fields (used everywhere in Orbit)
   * Candid opt types require array wrapping: [value] for Some, [] for None
   */
  encodeOptional(value, encoder = (v) => v) {
    return value !== null && value !== undefined ? [encoder(value)] : [];
  }

  /**
   * Common array encoding for optional arrays
   * Used when the field itself is optional and contains an array
   */
  encodeOptionalArray(array) {
    return array && array.length > 0 ? [array] : [];
  }

  /**
   * Common error handling with service context
   * Handles Orbit's Result<T, Error> pattern consistently
   */
  async handleOrbitCall(methodName, params, decoder) {
    try {
      console.log(`[${this.serviceName}] Calling ${methodName}:`, params);
      const result = await this.actor[methodName](params);

      if (result && typeof result === 'object') {
        // Handle Orbit's double-wrapped results: Result::Ok(Result::Ok/Err)
        if ('Ok' in result) {
          const innerResult = result.Ok;
          // Check for inner Result
          if (innerResult && typeof innerResult === 'object' && 'Ok' in innerResult) {
            return decoder ? decoder(innerResult.Ok) : innerResult.Ok;
          } else if (innerResult && typeof innerResult === 'object' && 'Err' in innerResult) {
            throw new Error(innerResult.Err.message || JSON.stringify(innerResult.Err));
          }
          // Single-wrapped Ok
          return decoder ? decoder(innerResult) : innerResult;
        } else if ('Err' in result) {
          throw new Error(result.Err.message || JSON.stringify(result.Err));
        }
      }

      return decoder ? decoder(result) : result;
    } catch (error) {
      console.error(`[${this.serviceName}] ${methodName} failed:`, error);
      throw error;
    }
  }

  /**
   * Common pagination encoding
   * Most Orbit APIs use this structure for pagination
   */
  encodePagination(paginate) {
    if (!paginate) {
      // Default pagination
      return {
        offset: [0],
        limit: [100]
      };
    }
    return {
      offset: this.encodeOptional(paginate.offset || 0),
      limit: this.encodeOptional(paginate.limit || 100)
    };
  }

  /**
   * Common date/time handling
   * Converts JS Date to IC nanoseconds (BigInt)
   */
  encodeTimestamp(date) {
    if (!date) return [];
    const timestamp = date instanceof Date ? date.getTime() : date;
    return [BigInt(timestamp * 1000000)]; // Convert to nanoseconds
  }

  /**
   * Decode timestamp from IC format to JS Date
   */
  decodeTimestamp(nanos) {
    if (!nanos) return null;
    return new Date(Number(nanos) / 1000000);
  }

  /**
   * Common UUID validation
   */
  isValidUUID(str) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(str);
  }

  /**
   * Common principal validation
   */
  isValidPrincipal(str) {
    try {
      if (typeof str === 'object' && str.toText) {
        return true; // Already a Principal object
      }
      // Basic principal format check
      return /^[a-z0-9-]{5,63}$/.test(str) || /^[A-Z0-9]{64}$/.test(str);
    } catch {
      return false;
    }
  }

  /**
   * Handle error responses consistently
   */
  handleError(error) {
    if (typeof error === 'object' && error.code) {
      // Already a structured error
      return error;
    }
    // Convert string errors to structured format
    return {
      code: 'UNKNOWN_ERROR',
      message: error.toString(),
      details: []
    };
  }

  /**
   * Cache management for read operations
   */
  getCached(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      console.log(`[${this.serviceName}] Using cached data for ${key}`);
      return cached.data;
    }
    return null;
  }

  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clearCache() {
    this.cache.clear();
  }

  /**
   * Common request input builder for create_request operations
   */
  buildRequestInput(operation, title, summary = [], executionPlan = []) {
    return {
      operation,
      title: typeof title === 'string' ? [title] : title,
      summary: summary.length > 0 ? summary : [],
      execution_plan: executionPlan.length > 0 ? executionPlan : []
    };
  }

  /**
   * Common metadata encoding for Orbit metadata fields
   */
  encodeMetadata(metadata) {
    if (!metadata || !Array.isArray(metadata)) return [];
    return [metadata.map(item => ({
      key: item.key,
      value: item.value
    }))];
  }

  /**
   * Common sorting criteria encoding
   */
  encodeSortingCriteria(sortBy) {
    if (!sortBy) return [];

    const criteria = [];
    if (sortBy.createdAt) {
      criteria.push({
        CreatedAt: sortBy.createdAt === 'asc' ? { Asc: null } : { Desc: null }
      });
    } else if (sortBy.expirationDt) {
      criteria.push({
        ExpirationDt: sortBy.expirationDt === 'asc' ? { Asc: null } : { Desc: null }
      });
    } else if (sortBy.lastModified) {
      criteria.push({
        LastModificationDt: sortBy.lastModified === 'asc' ? { Asc: null } : { Desc: null }
      });
    }
    return criteria;
  }

  /**
   * Common status encoding for request statuses
   */
  encodeRequestStatuses(statuses) {
    if (!statuses || statuses.length === 0) return [];

    // Map common status names to Orbit variants
    const statusMap = {
      'created': { Created: null },
      'processing': { Processing: null },
      'completed': { Completed: null },
      'failed': { Failed: null },
      'rejected': { Rejected: null },
      'cancelled': { Cancelled: null }
    };

    const mapped = statuses.map(s => {
      const lower = s.toLowerCase();
      return statusMap[lower] || { [s]: null };
    });

    return [mapped];
  }

  /**
   * Common result extraction for paginated responses
   */
  extractPaginatedResult(result, itemsKey = 'items') {
    return {
      items: result[itemsKey] || [],
      total: result.total ? Number(result.total) : 0,
      nextOffset: result.next_offset ? Number(result.next_offset[0]) : null
    };
  }

  /**
   * Common blockchain validation
   */
  isValidBlockchain(blockchain) {
    return ['icp', 'eth', 'btc'].includes(blockchain);
  }

  /**
   * Common address format detection
   */
  detectAddressFormat(address, blockchain) {
    if (blockchain === 'icp') {
      if (address.length === 64 && /^[0-9a-f]{64}$/i.test(address)) {
        return 'icp_account_identifier';
      }
      if (address.includes('-')) {
        return 'icrc1_account';
      }
    } else if (blockchain === 'eth') {
      if (/^0x[0-9a-fA-F]{40}$/.test(address)) {
        return 'ethereum_address';
      }
    } else if (blockchain === 'btc') {
      if (address.startsWith('bc1') && address.length === 42) {
        return 'bitcoin_address_p2wpkh';
      }
      if (address.startsWith('bc1p') && address.length === 62) {
        return 'bitcoin_address_p2tr';
      }
    }
    return null;
  }
}