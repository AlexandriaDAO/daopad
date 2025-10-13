/**
 * Structured Logging Service
 *
 * Provides comprehensive logging with:
 * - Development console output with colors
 * - Production log buffering and batching
 * - Sensitive data sanitization
 * - Error tracking integration
 * - Configurable log levels
 */

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
  fatal: 4
};

class Logger {
  constructor(config = {}) {
    this.level = config.level || 'info';
    this.isDevelopment = config.isDevelopment ?? (typeof import.meta !== 'undefined' && import.meta.env?.DEV);
    this.remoteEndpoint = config.remoteEndpoint;
    this.buffer = [];
    this.maxBufferSize = config.maxBufferSize || 100;
    this.flushInterval = config.flushInterval || 30000; // 30 seconds
    this.errorTracker = config.errorTracker;

    // Start periodic flush in production
    if (!this.isDevelopment && this.remoteEndpoint) {
      this.startPeriodicFlush();
    }
  }

  /**
   * Main logging method
   * @param {string} level - Log level (debug, info, warn, error, fatal)
   * @param {string} message - Log message
   * @param {object} context - Additional context
   */
  log(level, message, context = {}) {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitize(context),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
      url: typeof window !== 'undefined' ? window.location.href : 'n/a'
    };

    // In development: console output with colors
    if (this.isDevelopment) {
      this.consoleOutput(entry);
    }

    // In production: buffer and batch send
    if (!this.isDevelopment && this.remoteEndpoint) {
      this.buffer.push(entry);
      this.flushIfNeeded();
    }
  }

  /**
   * Check if log level should be output
   */
  shouldLog(level) {
    const currentLevel = LOG_LEVELS[this.level] || LOG_LEVELS.info;
    const messageLevel = LOG_LEVELS[level] || LOG_LEVELS.info;
    return messageLevel >= currentLevel;
  }

  /**
   * Console output with colors (development only)
   */
  consoleOutput(entry) {
    const colors = {
      debug: '\x1b[36m',    // Cyan
      info: '\x1b[34m',     // Blue
      warn: '\x1b[33m',     // Yellow
      error: '\x1b[31m',    // Red
      fatal: '\x1b[35m'     // Magenta
    };
    const reset = '\x1b[0m';
    const color = colors[entry.level] || '';

    const prefix = `${color}[${entry.level.toUpperCase()}] ${entry.timestamp}${reset}`;
    const contextStr = Object.keys(entry.context).length > 0
      ? `\n  ${JSON.stringify(entry.context, null, 2)}`
      : '';

    console.log(`${prefix} ${entry.message}${contextStr}`);
  }

  /**
   * Security: sanitize sensitive data before logging
   */
  sanitize(data) {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = Array.isArray(data) ? [...data] : { ...data };
    const sensitiveKeys = [
      'password',
      'privateKey',
      'private_key',
      'seed',
      'mnemonic',
      'secret',
      'token',
      'apiKey',
      'api_key',
      'authorization',
      'cookie',
      'session'
    ];

    const sanitizeObject = (obj) => {
      if (!obj || typeof obj !== 'object') {
        return obj;
      }

      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeObject(item));
      }

      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveKeys.some(sensitive =>
          lowerKey.includes(sensitive.toLowerCase())
        );

        if (isSensitive) {
          result[key] = '[REDACTED]';
        } else if (value && typeof value === 'object') {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return sanitizeObject(sanitized);
  }

  /**
   * Flush buffer if it reaches max size
   */
  flushIfNeeded() {
    if (this.buffer.length >= this.maxBufferSize) {
      this.flush();
    }
  }

  /**
   * Send buffered logs to remote endpoint
   */
  async flush() {
    if (this.buffer.length === 0 || !this.remoteEndpoint) {
      return;
    }

    const logsToSend = [...this.buffer];
    this.buffer = [];

    try {
      await fetch(this.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToSend,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      // Can't log errors from logger itself, store back in buffer
      this.buffer.push(...logsToSend.slice(-10)); // Keep last 10
    }
  }

  /**
   * Start periodic flush timer
   */
  startPeriodicFlush() {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.flushInterval);
  }

  /**
   * Stop periodic flush and send remaining logs
   */
  async destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    await this.flush();
  }

  /**
   * Error tracking integration
   */
  captureError(error, context = {}) {
    const errorContext = {
      ...context,
      errorName: error.name,
      errorMessage: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString()
    };

    this.log('error', error.message, errorContext);

    // Send to error tracking service if configured
    if (this.errorTracker && typeof this.errorTracker.captureException === 'function') {
      try {
        this.errorTracker.captureException(error, errorContext);
      } catch (trackerError) {
        // Silent fail - don't break on tracker errors
      }
    }
  }

  // Convenience methods
  debug(message, context) {
    this.log('debug', message, context);
  }

  info(message, context) {
    this.log('info', message, context);
  }

  warn(message, context) {
    this.log('warn', message, context);
  }

  error(message, context) {
    this.log('error', message, context);
  }

  fatal(message, context) {
    this.log('fatal', message, context);
  }
}

// Create singleton instance
const logger = new Logger({
  isDevelopment: typeof import.meta !== 'undefined' && import.meta.env?.DEV,
  level: typeof import.meta !== 'undefined' ? (import.meta.env?.VITE_LOG_LEVEL || 'info') : 'info'
});

// Cleanup on page unload
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    logger.destroy();
  });
}

export { Logger, logger };
