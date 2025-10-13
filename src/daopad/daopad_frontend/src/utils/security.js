/**
 * Security Utilities
 *
 * Provides:
 * - Content Security Policy configuration
 * - Rate limiting for API calls
 * - Input sanitization
 * - Session timeout management
 * - Secure random generation
 */

import { logger } from '../services/logging/Logger';

/**
 * Security Manager - Comprehensive security utilities
 */
export class SecurityManager {
  /**
   * Get Content Security Policy headers
   * These should be configured on the server/canister level
   */
  static getCSPHeaders() {
    return {
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://icp0.io https://ic0.app",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: https: blob:",
        "connect-src 'self' https://icp0.io https://ic0.app wss://icp0.io",
        "font-src 'self' data:",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "base-uri 'self'",
        "form-action 'self'"
      ].join('; '),
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': 'DENY',
      'X-XSS-Protection': '1; mode=block',
      'Referrer-Policy': 'strict-origin-when-cross-origin',
      'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
    };
  }

  /**
   * Create rate limiter for API calls
   *
   * @param {object} options - Rate limiter options
   * @returns {object} Rate limiter instance
   */
  static createRateLimiter(options = {}) {
    const {
      maxRequests = 10,
      windowMs = 60000, // 1 minute
      identifier = 'global'
    } = options;

    const requests = new Map();
    let cleanupTimer = null;

    // Periodically clean up old entries
    const startCleanup = () => {
      cleanupTimer = setInterval(() => {
        const now = Date.now();
        for (const [key, timestamps] of requests.entries()) {
          const valid = timestamps.filter(t => now - t < windowMs);
          if (valid.length === 0) {
            requests.delete(key);
          } else {
            requests.set(key, valid);
          }
        }

        logger.debug('Rate limiter cleanup', {
          activeKeys: requests.size
        });
      }, windowMs);
    };

    startCleanup();

    return {
      /**
       * Acquire rate limit token
       * @param {string} id - Identifier for rate limiting
       * @throws {Error} If rate limit exceeded
       */
      async acquire(id = identifier) {
        const now = Date.now();
        const key = `${identifier}:${id}`;

        if (!requests.has(key)) {
          requests.set(key, []);
        }

        const timestamps = requests.get(key);

        // Remove old timestamps outside the window
        const valid = timestamps.filter(t => now - t < windowMs);

        if (valid.length >= maxRequests) {
          const oldestTime = valid[0];
          const waitTime = windowMs - (now - oldestTime);

          logger.warn('Rate limit exceeded', {
            identifier: key,
            waitTime,
            requests: valid.length,
            maxRequests
          });

          throw new Error(
            `Rate limit exceeded. Please try again in ${Math.ceil(waitTime / 1000)} seconds.`
          );
        }

        // Add current request timestamp
        valid.push(now);
        requests.set(key, valid);

        logger.debug('Rate limit token acquired', {
          identifier: key,
          currentRequests: valid.length,
          maxRequests
        });
      },

      /**
       * Release/cleanup (for manual cleanup)
       */
      release() {
        const now = Date.now();
        for (const [key, timestamps] of requests.entries()) {
          const valid = timestamps.filter(t => now - t < windowMs);
          if (valid.length === 0) {
            requests.delete(key);
          } else {
            requests.set(key, valid);
          }
        }
      },

      /**
       * Destroy rate limiter and stop cleanup
       */
      destroy() {
        if (cleanupTimer) {
          clearInterval(cleanupTimer);
          cleanupTimer = null;
        }
        requests.clear();
        logger.info('Rate limiter destroyed');
      },

      /**
       * Get current request count for identifier
       */
      getCount(id = identifier) {
        const key = `${identifier}:${id}`;
        const timestamps = requests.get(key) || [];
        const now = Date.now();
        return timestamps.filter(t => now - t < windowMs).length;
      }
    };
  }

  /**
   * Sanitize user input for display
   * Removes potential XSS vectors
   *
   * @param {string} input - Input to sanitize
   * @param {object} options - Sanitization options
   * @returns {string} Sanitized input
   */
  static sanitizeForDisplay(input, options = {}) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    const {
      allowedTags = [],
      allowedAttributes = {},
      maxLength = 10000
    } = options;

    // Truncate if too long
    let sanitized = input.substring(0, maxLength);

    // If no tags allowed, escape everything
    if (allowedTags.length === 0) {
      return sanitized
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }

    // For production, use DOMPurify library
    // This is a basic implementation for demonstration
    // Remove script tags
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');

    // Remove event handlers
    sanitized = sanitized.replace(/on\w+\s*=\s*["'][^"']*["']/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=\s*[^\s>]*/gi, '');

    // Remove javascript: and data: URIs
    sanitized = sanitized.replace(/href\s*=\s*["']javascript:[^"']*["']/gi, 'href="#"');
    sanitized = sanitized.replace(/src\s*=\s*["']data:[^"']*["']/gi, 'src=""');

    logger.debug('Input sanitized for display', {
      originalLength: input.length,
      sanitizedLength: sanitized.length,
      truncated: input.length > maxLength
    });

    return sanitized;
  }

  /**
   * Generate cryptographically secure random values
   *
   * @param {number} length - Length of random string
   * @returns {string} Random hex string
   */
  static generateSecureRandom(length = 32) {
    if (typeof crypto === 'undefined' || !crypto.getRandomValues) {
      logger.warn('Crypto API not available, falling back to Math.random()');
      // Fallback for older browsers (less secure)
      return Array.from({ length }, () =>
        Math.floor(Math.random() * 256).toString(16).padStart(2, '0')
      ).join('');
    }

    const array = new Uint8Array(length);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Create session timeout manager
   *
   * @param {object} options - Session options
   * @returns {object} Session manager instance
   */
  static createSessionManager(options = {}) {
    const {
      timeout = 30 * 60 * 1000, // 30 minutes
      warningTime = 5 * 60 * 1000, // 5 minute warning
      onTimeout = null,
      onWarning = null,
      events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'mousemove']
    } = options;

    let timer = null;
    let warningTimer = null;
    let lastActivity = Date.now();
    let isActive = true;

    const reset = () => {
      if (!isActive) return;

      lastActivity = Date.now();

      // Clear existing timers
      if (timer) clearTimeout(timer);
      if (warningTimer) clearTimeout(warningTimer);

      // Set warning timer
      warningTimer = setTimeout(() => {
        if (onWarning && isActive) {
          logger.info('Session timeout warning');
          try {
            onWarning();
          } catch (error) {
            logger.error('Session warning callback failed', { error });
          }
        }
      }, timeout - warningTime);

      // Set timeout timer
      timer = setTimeout(() => {
        if (isActive) {
          logger.info('Session timeout reached');
          isActive = false;

          if (onTimeout) {
            try {
              onTimeout();
            } catch (error) {
              logger.error('Session timeout callback failed', { error });
            }
          }
        }
      }, timeout);

      logger.debug('Session activity reset', {
        timeout,
        warningTime
      });
    };

    // Throttled reset to avoid excessive calls
    let resetThrottle = null;
    const throttledReset = () => {
      if (resetThrottle) return;

      resetThrottle = setTimeout(() => {
        reset();
        resetThrottle = null;
      }, 1000); // Throttle to once per second
    };

    // Add event listeners
    events.forEach(event => {
      document.addEventListener(event, throttledReset, { passive: true });
    });

    // Start the timer
    reset();

    logger.info('Session manager created', {
      timeout,
      warningTime,
      events
    });

    return {
      /**
       * Manually reset session timer
       */
      reset,

      /**
       * Get time remaining until timeout
       */
      getTimeRemaining() {
        if (!isActive) return 0;
        return Math.max(0, timeout - (Date.now() - lastActivity));
      },

      /**
       * Check if session is still active
       */
      isActive() {
        return isActive;
      },

      /**
       * Extend session timeout
       */
      extend(additionalTime) {
        if (!isActive) {
          logger.warn('Cannot extend inactive session');
          return false;
        }

        lastActivity += additionalTime;
        reset();
        logger.info('Session extended', { additionalTime });
        return true;
      },

      /**
       * Destroy session manager
       */
      destroy() {
        isActive = false;

        if (timer) clearTimeout(timer);
        if (warningTimer) clearTimeout(warningTimer);
        if (resetThrottle) clearTimeout(resetThrottle);

        events.forEach(event => {
          document.removeEventListener(event, throttledReset);
        });

        logger.info('Session manager destroyed');
      }
    };
  }

  /**
   * Validate and sanitize file upload
   *
   * @param {File} file - File to validate
   * @param {object} options - Validation options
   * @returns {boolean} True if valid
   * @throws {Error} If validation fails
   */
  static validateFileUpload(file, options = {}) {
    const {
      maxSize = 5 * 1024 * 1024, // 5MB default
      allowedTypes = [],
      allowedExtensions = []
    } = options;

    if (!file) {
      throw new Error('No file provided');
    }

    // Check file size
    if (file.size > maxSize) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(2);
      throw new Error(`File size ${sizeMB}MB exceeds maximum ${maxSizeMB}MB`);
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(file.type)) {
      throw new Error(`File type ${file.type} is not allowed`);
    }

    // Check file extension
    if (allowedExtensions.length > 0) {
      const extension = file.name.split('.').pop()?.toLowerCase();
      if (!extension || !allowedExtensions.includes(extension)) {
        throw new Error(`File extension .${extension} is not allowed`);
      }
    }

    logger.info('File validated', {
      name: file.name,
      size: file.size,
      type: file.type
    });

    return true;
  }
}

// Create global rate limiter for general use
export const globalRateLimiter = SecurityManager.createRateLimiter({
  maxRequests: 20,
  windowMs: 60000,
  identifier: 'global-api'
});
