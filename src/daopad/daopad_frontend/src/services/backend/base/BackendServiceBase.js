import { Actor, HttpAgent } from '@dfinity/agent';
import { Principal } from '@dfinity/principal';
import { idlFactory, canisterId } from '../../../declarations/daopad_backend';
import { logger } from '../../logging/Logger';
import { ErrorHandler, ServiceError } from '../../../utils/errorHandling';
import { Validator } from '../../../utils/validation';

const DEFAULT_BACKEND_ID = 'lwsav-iiaaa-aaaap-qp2qq-cai';
const BACKEND_CANISTER_ID = canisterId ?? DEFAULT_BACKEND_ID;

/**
 * Enhanced Backend Service Base Class
 *
 * Provides:
 * - Error handling with retry logic
 * - Input validation
 * - Request logging
 * - Timeout handling
 *
 * Note: Rate limiting removed from base class for better UX.
 * Implement per-method using SecurityManager.createRateLimiter() if needed.
 */
export class BackendServiceBase {
  constructor(identity = null) {
    this.identity = identity;
    this.actor = null;
    this.lastIdentity = null;
    this.requestCounter = 0;
  }

  async getActor() {
    // Cache actor but recreate if identity changed
    if (!this.actor || this.identity !== this.lastIdentity) {
      const isLocal = import.meta.env.VITE_DFX_NETWORK === 'local';
      const host = isLocal ? 'http://localhost:4943' : 'https://icp0.io';

      const agent = new HttpAgent({
        identity: this.identity,
        host,
      });

      if (isLocal) {
        await agent.fetchRootKey();
      }

      this.actor = Actor.createActor(idlFactory, {
        agent,
        canisterId: BACKEND_CANISTER_ID,
      });

      this.lastIdentity = this.identity;
    }

    return this.actor;
  }

  /**
   * Wrap backend Result<T, String> responses
   */
  wrapResult(result) {
    if ('Ok' in result) {
      return { success: true, data: result.Ok };
    } else if ('Err' in result) {
      return { success: false, error: result.Err };
    }
    return { success: false, error: 'Invalid response format' };
  }

  /**
   * Wrap backend Option<T> responses
   */
  wrapOption(result) {
    if (Array.isArray(result) && result.length > 0) {
      return { success: true, data: result[0] };
    } else if (Array.isArray(result)) {
      return { success: true, data: null };
    }
    return { success: false, error: 'Invalid option format' };
  }

  /**
   * Convert to Principal (handles string/Principal/object)
   */
  toPrincipal(value) {
    if (!value) return null;
    if (value instanceof Principal) return value;
    if (typeof value === 'string') return Principal.fromText(value);
    if (typeof value.toText === 'function') return value;
    if (typeof value.toString === 'function') {
      try {
        return Principal.fromText(value.toString());
      } catch {
        return null;
      }
    }
    return null;
  }

  /**
   * Convert Principal to text
   */
  toText(principal) {
    if (!principal) return null;
    if (typeof principal === 'string') return principal;
    if (typeof principal.toText === 'function') return principal.toText();
    if (typeof principal.toString === 'function') return principal.toString();
    return String(principal);
  }

  /**
   * Generate unique request ID for tracking
   */
  generateRequestId() {
    this.requestCounter++;
    return `${Date.now()}-${this.requestCounter}`;
  }

  /**
   * Execute actor method with comprehensive error handling
   *
   * Note: Rate limiting removed from base class - implement per-method if needed
   * using SecurityManager.createRateLimiter() for specific high-traffic operations
   *
   * @param {string} method - Method name to call
   * @param {Array} args - Method arguments
   * @param {object} options - Execution options
   * @returns {Promise} Result of method execution
   */
  async executeMethod(method, args = [], options = {}) {
    const {
      timeout = 30000,
      retries = 3,
      validateArgs = true,
      logRequest = true
    } = options;

    const requestId = this.generateRequestId();
    const startTime = Date.now();

    if (logRequest) {
      logger.info(`Backend call started: ${method}`, {
        requestId,
        method,
        argsCount: args.length
      });
    }

    try {

      // Execute with retry logic and timeout
      const result = await ErrorHandler.handleWithRetry(
        async () => {
          const actor = await this.getActor();

          if (!actor[method]) {
            throw new Error(`Method '${method}' not found on backend actor`);
          }

          // Wrap in timeout
          const callPromise = actor[method](...args);
          const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error(`Request timed out after ${timeout}ms`)), timeout)
          );

          return Promise.race([callPromise, timeoutPromise]);
        },
        retries,
        1000,
        (attempt, maxRetries) => {
          logger.warn(`Retrying backend call: ${method}`, {
            requestId,
            attempt,
            maxRetries
          });
        }
      );

      const duration = Date.now() - startTime;

      if (logRequest) {
        logger.info(`Backend call succeeded: ${method}`, {
          requestId,
          duration,
          method
        });
      }

      return result;

    } catch (error) {
      const duration = Date.now() - startTime;
      const classified = ErrorHandler.classify(error);

      logger.error(`Backend call failed: ${method}`, {
        requestId,
        method,
        duration,
        error: error.message,
        errorType: classified.type,
        stack: error.stack
      });

      throw new ServiceError(
        classified.userMessage,
        error,
        classified
      );
    }
  }

  /**
   * Execute method with result wrapping (for Result<T, E> types)
   */
  async executeWithResultWrapper(method, args = [], options = {}) {
    const result = await this.executeMethod(method, args, options);
    return this.wrapResult(result);
  }

  /**
   * Execute method with option wrapping (for Option<T> types)
   */
  async executeWithOptionWrapper(method, args = [], options = {}) {
    const result = await this.executeMethod(method, args, options);
    return this.wrapOption(result);
  }

  /**
   * Validate Principal argument
   */
  validatePrincipalArg(value, fieldName = 'Principal') {
    try {
      Validator.validatePrincipal(value);
      return this.toPrincipal(value);
    } catch (error) {
      logger.warn(`Invalid principal argument: ${fieldName}`, {
        value,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Validate Amount argument
   */
  validateAmountArg(value, options = {}) {
    const {
      fieldName = 'Amount',
      min = 0,
      max = Number.MAX_SAFE_INTEGER,
      decimals = 8
    } = options;

    try {
      Validator.validateAmount(value, {
        min,
        max,
        decimals,
        fieldName
      });
      return value;
    } catch (error) {
      logger.warn(`Invalid amount argument: ${fieldName}`, {
        value,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Sanitize params for logging (remove sensitive data)
   */
  sanitizeParams(params) {
    if (!params || typeof params !== 'object') {
      return params;
    }

    const sanitized = { ...params };
    const sensitiveKeys = ['password', 'seed', 'privateKey', 'mnemonic'];

    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }
}
