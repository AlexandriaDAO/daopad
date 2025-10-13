/**
 * Edge Case Handlers
 *
 * Provides utilities for handling:
 * - BigInt operations safely
 * - Network timeouts
 * - Concurrent operations (mutex)
 * - Memory leak prevention
 * - Virtualized lists for performance
 */

import { logger } from '../services/logging/Logger';

/**
 * Edge Case Handlers - Utilities for handling edge cases
 */
export class EdgeCaseHandlers {
  /**
   * Safely convert BigInt to Number with overflow protection
   *
   * @param {bigint} bigInt - BigInt value to convert
   * @param {object} options - Conversion options
   * @returns {number} Converted number
   * @throws {Error} If overflow and throwOnOverflow is true
   */
  static safeBigIntToNumber(bigInt, options = {}) {
    const {
      throwOnOverflow = true,
      maxValue = Number.MAX_SAFE_INTEGER,
      minValue = Number.MIN_SAFE_INTEGER,
      clampOnOverflow = false
    } = options;

    // Validate input
    if (typeof bigInt !== 'bigint') {
      try {
        bigInt = BigInt(bigInt);
      } catch (error) {
        throw new Error(`Cannot convert to BigInt: ${error.message}`);
      }
    }

    // Check overflow
    const exceedsMax = bigInt > BigInt(maxValue);
    const exceedsMin = bigInt < BigInt(minValue);

    if (exceedsMax || exceedsMin) {
      const direction = exceedsMax ? 'maximum' : 'minimum';
      const limit = exceedsMax ? maxValue : minValue;
      const message = `BigInt ${bigInt} exceeds safe ${direction} value ${limit}`;

      logger.error('BigInt overflow detected', {
        bigInt: bigInt.toString(),
        maxValue,
        minValue,
        exceedsMax,
        exceedsMin
      });

      if (throwOnOverflow && !clampOnOverflow) {
        throw new Error(message);
      }

      if (clampOnOverflow) {
        logger.warn('Clamping BigInt to safe range', {
          original: bigInt.toString(),
          clamped: limit
        });
        return limit;
      }

      // If neither throw nor clamp, warn and convert anyway (unsafe)
      logger.warn('Converting unsafe BigInt to Number', {
        bigInt: bigInt.toString()
      });
    }

    const result = Number(bigInt);

    logger.debug('BigInt converted to Number', {
      bigInt: bigInt.toString(),
      result,
      safe: !exceedsMax && !exceedsMin
    });

    return result;
  }

  /**
   * Perform BigInt operations safely with overflow checking
   *
   * @param {string} operation - Operation to perform (add, subtract, multiply, divide)
   * @param {bigint|number|string} a - First operand
   * @param {bigint|number|string} b - Second operand
   * @param {object} options - Operation options
   * @returns {bigint} Result of operation
   * @throws {Error} If operation fails or overflows
   */
  static safeBigIntOperation(operation, a, b, options = {}) {
    const { throwOnOverflow = false } = options;
    try {
      // Convert to BigInt
      const bigA = typeof a === 'bigint' ? a : BigInt(a);
      const bigB = typeof b === 'bigint' ? b : BigInt(b);

      let result;

      switch (operation) {
        case 'add':
          result = bigA + bigB;
          break;

        case 'subtract':
          result = bigA - bigB;
          // Check for underflow (negative result where not expected)
          if (result < 0n) {
            logger.warn('BigInt subtraction resulted in negative value', {
              a: a.toString(),
              b: b.toString(),
              result: result.toString()
            });
          }
          break;

        case 'multiply':
          result = bigA * bigB;
          // Check if result exceeds safe integer range
          if (result > BigInt(Number.MAX_SAFE_INTEGER)) {
            const message = 'BigInt multiplication exceeds safe integer range';
            logger.warn(message, {
              a: a.toString(),
              b: b.toString(),
              result: result.toString(),
              maxSafeInteger: Number.MAX_SAFE_INTEGER
            });

            if (throwOnOverflow) {
              throw new Error(`${message}: ${result.toString()}`);
            }
          }
          break;

        case 'divide':
          if (bigB === 0n) {
            throw new Error('Division by zero');
          }
          result = bigA / bigB;
          break;

        case 'modulo':
          if (bigB === 0n) {
            throw new Error('Modulo by zero');
          }
          result = bigA % bigB;
          break;

        case 'power':
          // BigInt doesn't support negative exponents
          if (bigB < 0n) {
            throw new Error('BigInt power operation does not support negative exponents');
          }
          result = bigA ** bigB;
          break;

        default:
          throw new Error(`Unknown operation: ${operation}`);
      }

      logger.debug('BigInt operation completed', {
        operation,
        a: a.toString(),
        b: b.toString(),
        result: result.toString()
      });

      return result;

    } catch (error) {
      logger.error('BigInt operation failed', {
        operation,
        a: a?.toString(),
        b: b?.toString(),
        error: error.message
      });

      throw new Error(`Failed to perform ${operation}: ${error.message}`);
    }
  }

  /**
   * Execute promise with timeout
   *
   * @param {Promise} promise - Promise to execute
   * @param {number} timeoutMs - Timeout in milliseconds
   * @param {string} operationName - Name for logging
   * @returns {Promise} Result or timeout error
   */
  static async withTimeout(promise, timeoutMs = 30000, operationName = 'Operation') {
    let timeoutId;

    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId);

      logger.debug('Operation completed within timeout', {
        operationName,
        timeoutMs
      });

      return result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error.message.includes('timed out')) {
        logger.warn('Operation timeout', {
          operationName,
          timeoutMs
        });
      }

      throw error;
    }
  }

  /**
   * Create a mutex for synchronizing concurrent operations
   *
   * @returns {object} Mutex instance
   */
  static createMutex() {
    let locked = false;
    const waiting = [];

    return {
      /**
       * Acquire mutex lock
       */
      async acquire() {
        while (locked) {
          await new Promise(resolve => waiting.push(resolve));
        }
        locked = true;

        logger.debug('Mutex acquired', {
          waitingCount: waiting.length
        });
      },

      /**
       * Release mutex lock
       */
      release() {
        if (!locked) {
          logger.warn('Attempted to release unlocked mutex');
          return;
        }

        locked = false;
        const next = waiting.shift();

        if (next) {
          next();
        }

        logger.debug('Mutex released', {
          waitingCount: waiting.length
        });
      },

      /**
       * Check if mutex is currently locked
       */
      isLocked() {
        return locked;
      },

      /**
       * Get number of waiting promises
       */
      waitingCount() {
        return waiting.length;
      }
    };
  }

  /**
   * Create cleanup manager for preventing memory leaks
   *
   * @returns {object} Cleanup manager instance
   */
  static createCleanupManager() {
    const cleanups = new Set();
    let isDestroyed = false;

    return {
      /**
       * Register cleanup function
       * @param {Function} cleanup - Cleanup function to register
       * @returns {Function} Unregister function
       */
      register(cleanup) {
        if (isDestroyed) {
          logger.warn('Attempted to register cleanup on destroyed manager');
          return () => {};
        }

        if (typeof cleanup !== 'function') {
          logger.error('Cleanup must be a function');
          return () => {};
        }

        cleanups.add(cleanup);

        logger.debug('Cleanup registered', {
          totalCleanups: cleanups.size
        });

        // Return unregister function
        return () => {
          cleanups.delete(cleanup);
          logger.debug('Cleanup unregistered', {
            totalCleanups: cleanups.size
          });
        };
      },

      /**
       * Execute all cleanup functions
       */
      cleanup() {
        let successCount = 0;
        let errorCount = 0;

        logger.info('Running cleanup functions', {
          count: cleanups.size
        });

        for (const fn of cleanups) {
          try {
            fn();
            successCount++;
          } catch (error) {
            errorCount++;
            logger.error('Cleanup function failed', {
              error: error.message,
              stack: error.stack
            });
          }
        }

        cleanups.clear();

        logger.info('Cleanup completed', {
          successCount,
          errorCount
        });
      },

      /**
       * Destroy cleanup manager
       */
      destroy() {
        this.cleanup();
        isDestroyed = true;
        logger.info('Cleanup manager destroyed');
      },

      /**
       * Get number of registered cleanups
       */
      size() {
        return cleanups.size;
      }
    };
  }

  /**
   * Create virtualized list handler for memory-efficient rendering
   *
   * @param {object} options - Virtualization options
   * @returns {object} Virtualized list instance
   */
  static createVirtualizedList(options = {}) {
    const {
      itemHeight = 50,
      containerHeight = 500,
      buffer = 5,
      estimateItemHeight = null
    } = options;

    return {
      /**
       * Get visible range of items based on scroll position
       * @param {number} scrollTop - Current scroll position
       * @param {number} totalItems - Total number of items
       * @returns {object} Start and end indices of visible items
       */
      getVisibleRange(scrollTop, totalItems) {
        const start = Math.max(0, Math.floor(scrollTop / itemHeight) - buffer);
        const visibleCount = Math.ceil(containerHeight / itemHeight) + (buffer * 2);
        const end = Math.min(totalItems, start + visibleCount);

        logger.debug('Visible range calculated', {
          scrollTop,
          totalItems,
          start,
          end,
          visibleCount
        });

        return { start, end, visibleCount };
      },

      /**
       * Get style for item positioning
       * @param {number} index - Item index
       * @returns {object} CSS style object
       */
      getItemStyle(index) {
        const top = estimateItemHeight
          ? estimateItemHeight(index)
          : index * itemHeight;

        return {
          position: 'absolute',
          top: `${top}px`,
          height: `${itemHeight}px`,
          width: '100%'
        };
      },

      /**
       * Get total height of scrollable container
       * @param {number} totalItems - Total number of items
       * @returns {number} Total height in pixels
       */
      getTotalHeight(totalItems) {
        return totalItems * itemHeight;
      },

      /**
       * Get item index from scroll position
       * @param {number} scrollTop - Scroll position
       * @returns {number} Item index
       */
      getIndexFromScroll(scrollTop) {
        return Math.floor(scrollTop / itemHeight);
      },

      /**
       * Scroll to specific item index
       * @param {number} index - Item index
       * @returns {number} Scroll position
       */
      scrollToIndex(index) {
        return index * itemHeight;
      }
    };
  }

  /**
   * Debounce function calls
   *
   * @param {Function} fn - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  static debounce(fn, delay = 300) {
    let timeoutId = null;

    const debounced = function (...args) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        fn.apply(this, args);
        timeoutId = null;
      }, delay);
    };

    // Add cancel method
    debounced.cancel = () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
    };

    return debounced;
  }

  /**
   * Throttle function calls
   *
   * @param {Function} fn - Function to throttle
   * @param {number} limit - Minimum time between calls
   * @returns {Function} Throttled function
   */
  static throttle(fn, limit = 300) {
    let inThrottle = false;
    let lastResult;

    const throttled = function (...args) {
      if (!inThrottle) {
        lastResult = fn.apply(this, args);
        inThrottle = true;

        setTimeout(() => {
          inThrottle = false;
        }, limit);
      }

      return lastResult;
    };

    return throttled;
  }

  /**
   * Retry operation with exponential backoff
   *
   * @param {Function} fn - Async function to retry
   * @param {object} options - Retry options
   * @returns {Promise} Result of function
   */
  static async retryWithBackoff(fn, options = {}) {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 30000,
      backoffFactor = 2,
      onRetry = null
    } = options;

    let lastError;
    let delay = initialDelay;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries - 1) {
          const jitter = Math.random() * 0.3 * delay;
          const waitTime = Math.min(delay + jitter, maxDelay);

          logger.info('Retrying operation', {
            attempt: attempt + 1,
            maxRetries,
            waitTime,
            error: error.message
          });

          if (onRetry) {
            try {
              onRetry(attempt + 1, error);
            } catch (callbackError) {
              logger.error('Retry callback error', { error: callbackError });
            }
          }

          await new Promise(resolve => setTimeout(resolve, waitTime));
          delay = Math.min(delay * backoffFactor, maxDelay);
        }
      }
    }

    throw lastError;
  }

  /**
   * Safely parse JSON with error handling
   *
   * @param {string} json - JSON string to parse
   * @param {any} defaultValue - Default value if parsing fails
   * @returns {any} Parsed object or default value
   */
  static safeJsonParse(json, defaultValue = null) {
    try {
      return JSON.parse(json);
    } catch (error) {
      logger.warn('JSON parse failed', {
        error: error.message,
        json: json?.substring(0, 100)
      });
      return defaultValue;
    }
  }

  /**
   * Safely stringify JSON with error handling
   *
   * @param {any} obj - Object to stringify
   * @param {string} defaultValue - Default value if stringification fails
   * @returns {string} JSON string or default value
   */
  static safeJsonStringify(obj, defaultValue = '{}') {
    try {
      return JSON.stringify(obj);
    } catch (error) {
      logger.warn('JSON stringify failed', {
        error: error.message,
        type: typeof obj
      });
      return defaultValue;
    }
  }
}
