import { createStationClient } from './stationClient';

/**
 * Custom error class for Orbit Station operations
 */
export class OrbitStationError extends Error {
  constructor(message, detail = null, code = null) {
    super(message);
    this.name = 'OrbitStationError';
    this.detail = detail;
    this.code = code;
  }

  static fromCanisterError(error, operationName) {
    if (error?.detail) {
      // Map common Orbit Station error variants
      const detail = error.detail;

      if ('Unauthorized' in detail) {
        return new OrbitStationError(
          `Unauthorized to perform ${operationName}`,
          detail.Unauthorized,
          'UNAUTHORIZED'
        );
      }

      if ('NotFound' in detail) {
        return new OrbitStationError(
          `Resource not found during ${operationName}`,
          detail.NotFound,
          'NOT_FOUND'
        );
      }

      if ('ValidationError' in detail) {
        return new OrbitStationError(
          `Validation failed for ${operationName}`,
          detail.ValidationError,
          'VALIDATION_ERROR'
        );
      }

      if ('InsufficientPermissions' in detail) {
        return new OrbitStationError(
          `Insufficient permissions for ${operationName}`,
          detail.InsufficientPermissions,
          'INSUFFICIENT_PERMISSIONS'
        );
      }
    }

    // Fallback for unknown errors
    return new OrbitStationError(
      `Operation ${operationName} failed: ${error.message}`,
      error.detail || error,
      'UNKNOWN_ERROR'
    );
  }
}

/**
 * Helper to unwrap Orbit Station Result types and throw on errors
 */
function unwrapResult(result, operationName) {
  if ('Ok' in result) {
    return result.Ok;
  }

  if ('Err' in result) {
    throw OrbitStationError.fromCanisterError(
      { detail: result.Err },
      operationName
    );
  }

  // Should not happen with proper Orbit types
  throw new OrbitStationError(
    `Invalid result format from ${operationName}`,
    result,
    'INVALID_RESULT'
  );
}

/**
 * Enhanced station service wrapper that provides:
 * - Centralized error handling
 * - Consistent return types
 * - Operation logging
 * - Helper utilities for common patterns
 */
export class OrbitStationService {
  constructor({ stationId, identity, host }) {
    this.stationId = stationId;
    this.client = createStationClient({ stationId, identity, host });
    this.identity = identity;
  }

  /**
   * List users with enhanced error handling
   */
  async listUsers(params = {}) {
    try {
      return await this.client.listUsers(params);
    } catch (error) {
      throw OrbitStationError.fromCanisterError(error, 'listUsers');
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo() {
    try {
      return await this.client.getSystemInfo();
    } catch (error) {
      throw OrbitStationError.fromCanisterError(error, 'getSystemInfo');
    }
  }

  /**
   * Get a specific user by ID
   */
  async getUser(userId) {
    try {
      return await this.client.getUser(userId);
    } catch (error) {
      throw OrbitStationError.fromCanisterError(error, 'getUser');
    }
  }

  /**
   * List user groups
   */
  async listUserGroups(params = {}) {
    try {
      return await this.client.getUserGroups(params);
    } catch (error) {
      throw OrbitStationError.fromCanisterError(error, 'listUserGroups');
    }
  }

  /**
   * Create a new user (admin operation)
   */
  async createUser(userInput) {
    try {
      const request = {
        operation: {
          AddUser: userInput
        },
        title: [`Add user: ${userInput.name}`],
        summary: [],
        execution_plan: []
      };
      return await this.client.createRequest(request);
    } catch (error) {
      throw OrbitStationError.fromCanisterError(error, 'createUser');
    }
  }

  /**
   * Edit an existing user
   */
  async editUser(userId, updates) {
    try {
      const request = {
        operation: {
          EditUser: {
            user_id: userId,
            ...updates
          }
        },
        title: [`Edit user`],
        summary: [],
        execution_plan: []
      };
      return await this.client.createRequest(request);
    } catch (error) {
      throw OrbitStationError.fromCanisterError(error, 'editUser');
    }
  }

  /**
   * List requests/proposals
   */
  async listRequests(params = {}) {
    try {
      return await this.client.listRequests(params);
    } catch (error) {
      throw OrbitStationError.fromCanisterError(error, 'listRequests');
    }
  }

  /**
   * Get a specific request
   */
  async getRequest(requestId) {
    try {
      return await this.client.getRequest(requestId);
    } catch (error) {
      throw OrbitStationError.fromCanisterError(error, 'getRequest');
    }
  }

  /**
   * Get account balances
   */
  async listAccounts(params = {}) {
    try {
      return await this.client.listAccounts(params);
    } catch (error) {
      throw OrbitStationError.fromCanisterError(error, 'listAccounts');
    }
  }

  /**
   * List assets
   */
  async listAssets(params = {}) {
    try {
      return await this.client.listAssets(params);
    } catch (error) {
      throw OrbitStationError.fromCanisterError(error, 'listAssets');
    }
  }

  /**
   * List address book entries
   */
  async listAddressBookEntries(params = {}) {
    try {
      return await this.client.listAddressBookEntries(params);
    } catch (error) {
      throw OrbitStationError.fromCanisterError(error, 'listAddressBookEntries');
    }
  }

  /**
   * Get current user's info
   */
  async getMe() {
    try {
      return await this.client.getMe();
    } catch (error) {
      throw OrbitStationError.fromCanisterError(error, 'getMe');
    }
  }

  /**
   * Get station capabilities
   */
  async getCapabilities() {
    try {
      return await this.client.getCapabilities();
    } catch (error) {
      throw OrbitStationError.fromCanisterError(error, 'getCapabilities');
    }
  }

  /**
   * Health check - verifies the station is accessible
   */
  async healthCheck() {
    try {
      const systemInfo = await this.getSystemInfo();
      return {
        healthy: true,
        stationId: this.stationId,
        version: systemInfo.version || 'unknown',
        timestamp: Date.now(),
      };
    } catch (error) {
      return {
        healthy: false,
        stationId: this.stationId,
        error: error.message,
        code: error.code,
        timestamp: Date.now(),
      };
    }
  }

  /**
   * Check if current identity has specific permissions
   */
  async checkPermissions(permissions = []) {
    try {
      // TODO: Implement when we have permission checking
      // For now, assume basic access if we can get system info
      await this.getSystemInfo();
      return {
        hasAccess: true,
        permissions: permissions.reduce((acc, perm) => ({ ...acc, [perm]: true }), {}),
      };
    } catch (error) {
      return {
        hasAccess: false,
        permissions: permissions.reduce((acc, perm) => ({ ...acc, [perm]: false }), {}),
        error: error.message,
      };
    }
  }
}

/**
 * Factory function to create station service instances
 */
export function createStationService({ stationId, identity, host }) {
  return new OrbitStationService({ stationId, identity, host });
}

/**
 * Utility to safely create a station service and handle connection errors
 */
export async function connectToStation({ stationId, identity, host }) {
  try {
    const service = createStationService({ stationId, identity, host });
    const health = await service.healthCheck();

    if (!health.healthy) {
      throw new OrbitStationError(
        `Cannot connect to station ${stationId}`,
        health.error,
        'CONNECTION_FAILED'
      );
    }

    return { service, health };
  } catch (error) {
    if (error instanceof OrbitStationError) {
      throw error;
    }

    throw new OrbitStationError(
      `Failed to connect to station ${stationId}: ${error.message}`,
      error,
      'CONNECTION_ERROR'
    );
  }
}

export default OrbitStationService;