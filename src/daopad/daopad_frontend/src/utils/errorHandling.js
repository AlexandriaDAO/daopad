/**
 * Error Handling Utilities
 *
 * Provides:
 * - Error classification and categorization
 * - Automatic retry logic with exponential backoff
 * - User-friendly error messages
 * - Recovery strategies
 */

import { logger } from '../services/logging/Logger';

/**
 * Error Types
 */
export const ERROR_TYPES = {
  NETWORK_ERROR: 'NETWORK_ERROR',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  PERMISSION_ERROR: 'PERMISSION_ERROR',
  TIMEOUT_ERROR: 'TIMEOUT_ERROR',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  NOT_FOUND_ERROR: 'NOT_FOUND_ERROR',
  CONFLICT_ERROR: 'CONFLICT_ERROR',
  UNKNOWN_ERROR: 'UNKNOWN_ERROR'
};

/**
 * Recovery Actions
 */
export const RECOVERY_ACTIONS = {
  RETRY: 'RETRY',
  CORRECT_INPUT: 'CORRECT_INPUT',
  REQUEST_ACCESS: 'REQUEST_ACCESS',
  WAIT_AND_RETRY: 'WAIT_AND_RETRY',
  REFRESH_PAGE: 'REFRESH_PAGE',
  CONTACT_SUPPORT: 'CONTACT_SUPPORT',
  GO_BACK: 'GO_BACK'
};

/**
 * Error Handler - Classify and provide recovery strategies
 */
export class ErrorHandler {
  /**
   * Classify an error and determine recovery strategy
   * @param {Error} error - The error to classify
   * @returns {object} Classification with type, user message, and recovery action
   */
  static classify(error) {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorName = error?.name?.toLowerCase() || '';

    // Network errors
    if (
      errorName === 'networkerror' ||
      errorMessage.includes('network') ||
      errorMessage.includes('fetch') ||
      errorMessage.includes('connection') ||
      errorMessage.includes('offline')
    ) {
      return {
        type: ERROR_TYPES.NETWORK_ERROR,
        recoverable: true,
        userMessage: 'Network connection issue. Please check your internet connection and try again.',
        action: RECOVERY_ACTIONS.RETRY,
        retryable: true
      };
    }

    // Timeout errors
    if (
      errorMessage.includes('timeout') ||
      errorMessage.includes('timed out') ||
      errorMessage.includes('deadline exceeded')
    ) {
      return {
        type: ERROR_TYPES.TIMEOUT_ERROR,
        recoverable: true,
        userMessage: 'Request timed out. The operation took too long to complete.',
        action: RECOVERY_ACTIONS.RETRY,
        retryable: true
      };
    }

    // Validation errors
    if (
      errorName === 'validationerror' ||
      errorMessage.includes('invalid') ||
      errorMessage.includes('validation') ||
      errorMessage.includes('required') ||
      errorMessage.includes('must be')
    ) {
      return {
        type: ERROR_TYPES.VALIDATION_ERROR,
        recoverable: true,
        userMessage: error.message || 'Invalid input. Please check your data and try again.',
        action: RECOVERY_ACTIONS.CORRECT_INPUT,
        retryable: false
      };
    }

    // Permission errors
    if (
      errorMessage.includes('permission') ||
      errorMessage.includes('unauthorized') ||
      errorMessage.includes('forbidden') ||
      errorMessage.includes('access denied') ||
      error.status === 401 ||
      error.status === 403
    ) {
      return {
        type: ERROR_TYPES.PERMISSION_ERROR,
        recoverable: false,
        userMessage: 'You don\'t have permission for this action. Please check your access rights.',
        action: RECOVERY_ACTIONS.REQUEST_ACCESS,
        retryable: false
      };
    }

    // Rate limit errors
    if (
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      error.status === 429
    ) {
      return {
        type: ERROR_TYPES.RATE_LIMIT_ERROR,
        recoverable: true,
        userMessage: 'Too many requests. Please wait a moment and try again.',
        action: RECOVERY_ACTIONS.WAIT_AND_RETRY,
        retryable: true
      };
    }

    // Not found errors
    if (
      errorMessage.includes('not found') ||
      errorMessage.includes('does not exist') ||
      error.status === 404
    ) {
      return {
        type: ERROR_TYPES.NOT_FOUND_ERROR,
        recoverable: false,
        userMessage: 'The requested resource was not found.',
        action: RECOVERY_ACTIONS.GO_BACK,
        retryable: false
      };
    }

    // Conflict errors
    if (
      errorMessage.includes('conflict') ||
      errorMessage.includes('already exists') ||
      error.status === 409
    ) {
      return {
        type: ERROR_TYPES.CONFLICT_ERROR,
        recoverable: false,
        userMessage: 'A conflict occurred. The resource may already exist.',
        action: RECOVERY_ACTIONS.GO_BACK,
        retryable: false
      };
    }

    // Default unknown error
    return {
      type: ERROR_TYPES.UNKNOWN_ERROR,
      recoverable: false,
      userMessage: 'An unexpected error occurred. Please try again or contact support.',
      action: RECOVERY_ACTIONS.CONTACT_SUPPORT,
      retryable: false
    };
  }

  /**
   * Execute function with automatic retry logic
   * @param {Function} fn - Async function to execute
   * @param {number} maxRetries - Maximum retry attempts
   * @param {number} initialDelay - Initial delay in ms (will use exponential backoff)
   * @param {Function} onRetry - Optional callback on retry
   * @returns {Promise} Result of function execution
   */
  static async handleWithRetry(fn, maxRetries = 3, initialDelay = 1000, onRetry = null) {
    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await fn();
        return result;
      } catch (error) {
        lastError = error;
        const classified = this.classify(error);

        // Log the retry attempt
        logger.warn(`Retry attempt ${attempt + 1}/${maxRetries}`, {
          error: error.message,
          attempt: attempt + 1,
          maxRetries,
          errorType: classified.type,
          retryable: classified.retryable
        });

        // Don't retry if not retryable
        if (!classified.retryable) {
          logger.info('Error is not retryable, stopping retry attempts', {
            errorType: classified.type
          });
          throw error;
        }

        // Don't retry on last attempt
        if (attempt >= maxRetries - 1) {
          break;
        }

        // Call retry callback if provided
        if (onRetry) {
          try {
            onRetry(attempt + 1, maxRetries, error);
          } catch (callbackError) {
            logger.error('Retry callback failed', { error: callbackError });
          }
        }

        // Exponential backoff with jitter
        const jitter = Math.random() * 0.3 * delay; // Add up to 30% jitter
        const waitTime = delay + jitter;

        logger.debug(`Waiting ${Math.round(waitTime)}ms before retry`, {
          attempt: attempt + 1,
          delay,
          jitter: Math.round(jitter)
        });

        await new Promise(resolve => setTimeout(resolve, waitTime));

        // Exponential backoff: double the delay for next attempt
        delay *= 2;
      }
    }

    // All retries exhausted
    logger.error('All retry attempts exhausted', {
      maxRetries,
      error: lastError?.message
    });

    throw lastError;
  }

  /**
   * Create a user-friendly error message
   * @param {Error} error - The error
   * @returns {string} User-friendly message
   */
  static getUserMessage(error) {
    const classified = this.classify(error);
    return classified.userMessage;
  }

  /**
   * Get recovery action for an error
   * @param {Error} error - The error
   * @returns {string} Recovery action
   */
  static getRecoveryAction(error) {
    const classified = this.classify(error);
    return classified.action;
  }
}

/**
 * Service Error - Custom error class for service-layer errors
 */
export class ServiceError extends Error {
  constructor(message, originalError, classification) {
    super(message);
    this.name = 'ServiceError';
    this.originalError = originalError;
    this.classification = classification;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Async error wrapper for use in async functions
 * @param {Function} fn - Async function to wrap
 * @param {string} context - Context for error logging
 */
export async function asyncErrorHandler(fn, context = 'Unknown') {
  try {
    return await fn();
  } catch (error) {
    logger.error(`Error in ${context}`, {
      error: error.message,
      stack: error.stack
    });

    const classified = ErrorHandler.classify(error);
    throw new ServiceError(classified.userMessage, error, classified);
  }
}

/**
 * Note: For React Error Boundary HOC with JSX, see:
 * - EnhancedErrorBoundary component in components/common/
 * - withEnhancedErrorBoundary HOC for wrapping components
 */
