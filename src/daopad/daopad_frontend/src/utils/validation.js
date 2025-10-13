/**
 * Input Validation and Sanitization Utilities
 *
 * Provides:
 * - Principal ID validation
 * - Amount validation with bounds and decimals
 * - XSS prevention
 * - URL validation
 * - Form validation framework
 */

import { Principal } from '@dfinity/principal';
import DOMPurify from 'isomorphic-dompurify';
import { logger } from '../services/logging/Logger';

/**
 * Custom Validation Error
 */
export class ValidationError extends Error {
  constructor(message, field = null, fields = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.fields = fields;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * Validator - Comprehensive input validation
 */
export class Validator {
  /**
   * Validate Internet Computer Principal ID
   * @param {string} value - Principal ID to validate
   * @param {object} options - Validation options
   * @returns {boolean} True if valid
   * @throws {ValidationError} If validation fails
   */
  static validatePrincipal(value, options = {}) {
    const { required = true, allowAnonymous = false } = options;

    if (!value) {
      if (required) {
        throw new ValidationError('Principal ID is required', 'principal');
      }
      return true;
    }

    // Check if it's a string
    if (typeof value !== 'string') {
      throw new ValidationError('Principal ID must be a string', 'principal');
    }

    // Trim whitespace
    value = value.trim();

    try {
      const principal = Principal.fromText(value);

      // Check for anonymous principal if not allowed
      if (!allowAnonymous && principal.isAnonymous()) {
        throw new ValidationError('Anonymous principal is not allowed', 'principal');
      }

      return true;
    } catch (error) {
      logger.warn('Invalid principal ID format', { value, error: error.message });
      throw new ValidationError(
        'Invalid Principal ID format. Please check and try again.',
        'principal'
      );
    }
  }

  /**
   * Validate numeric amount with bounds and decimal places
   * @param {string|number} value - Amount to validate
   * @param {object} options - Validation options
   * @returns {boolean} True if valid
   * @throws {ValidationError} If validation fails
   */
  static validateAmount(value, options = {}) {
    const {
      min = 0,
      max = Number.MAX_SAFE_INTEGER,
      decimals = 8,
      required = true,
      allowZero = false,
      fieldName = 'Amount'
    } = options;

    // Required check
    if (value === null || value === undefined || value === '') {
      if (required) {
        throw new ValidationError(`${fieldName} is required`, 'amount');
      }
      return true;
    }

    // Convert to number
    const num = typeof value === 'string' ? parseFloat(value) : value;

    // Check if valid number
    if (isNaN(num)) {
      throw new ValidationError(`${fieldName} must be a valid number`, 'amount');
    }

    // Check if finite
    if (!isFinite(num)) {
      throw new ValidationError(`${fieldName} must be a finite number`, 'amount');
    }

    // Check zero
    if (num === 0 && !allowZero) {
      throw new ValidationError(`${fieldName} must be greater than zero`, 'amount');
    }

    // Check minimum
    if (num < min) {
      throw new ValidationError(
        `${fieldName} must be at least ${min}`,
        'amount'
      );
    }

    // Check maximum
    if (num > max) {
      throw new ValidationError(
        `${fieldName} cannot exceed ${max}`,
        'amount'
      );
    }

    // Check decimal places
    const valueStr = value.toString();
    const decimalIndex = valueStr.indexOf('.');

    if (decimalIndex !== -1) {
      const decimalPlaces = valueStr.length - decimalIndex - 1;
      if (decimalPlaces > decimals) {
        throw new ValidationError(
          `${fieldName} can have maximum ${decimals} decimal places`,
          'amount'
        );
      }
    }

    return true;
  }

  /**
   * Validate and sanitize HTML content (XSS prevention)
   * @param {string} dirty - HTML content to sanitize
   * @param {object} options - Sanitization options
   * @returns {string} Sanitized HTML
   */
  static sanitizeHtml(dirty, options = {}) {
    if (!dirty || typeof dirty !== 'string') {
      return '';
    }

    const {
      allowedTags = ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
      allowedAttributes = { a: ['href', 'title'] },
      keepContent = true
    } = options;

    // Use DOMPurify for production-grade HTML sanitization
    const sanitized = DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: allowedTags,
      ALLOWED_ATTR: allowedAttributes,
      KEEP_CONTENT: keepContent,
      RETURN_DOM_FRAGMENT: false,
      RETURN_DOM: false,
      RETURN_TRUSTED_TYPE: false
    });

    logger.debug('HTML sanitized with DOMPurify', {
      originalLength: dirty.length,
      sanitizedLength: sanitized.length,
      allowedTags: allowedTags.length
    });

    return sanitized;
  }

  /**
   * Validate URL
   * @param {string} url - URL to validate
   * @param {object} options - Validation options
   * @returns {boolean} True if valid
   * @throws {ValidationError} If validation fails
   */
  static validateUrl(url, options = {}) {
    const {
      required = true,
      protocols = ['http', 'https'],
      requireTld = true,
      allowLocal = false
    } = options;

    if (!url) {
      if (required) {
        throw new ValidationError('URL is required', 'url');
      }
      return true;
    }

    try {
      const parsed = new URL(url);

      // Check protocol
      const protocol = parsed.protocol.slice(0, -1); // Remove trailing ':'
      if (!protocols.includes(protocol)) {
        throw new ValidationError(
          `URL must use ${protocols.join(' or ')} protocol`,
          'url'
        );
      }

      // Check for TLD
      if (requireTld && !parsed.hostname.includes('.')) {
        throw new ValidationError(
          'URL must have a valid domain with TLD',
          'url'
        );
      }

      // Check for local addresses
      if (!allowLocal) {
        const localPatterns = [
          'localhost',
          '127.0.0.1',
          '0.0.0.0',
          '::1',
          '10.',
          '172.16.',
          '192.168.'
        ];

        const isLocal = localPatterns.some(pattern =>
          parsed.hostname.startsWith(pattern)
        );

        if (isLocal) {
          throw new ValidationError(
            'Local URLs are not allowed',
            'url'
          );
        }
      }

      return true;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }

      throw new ValidationError(
        'Invalid URL format',
        'url'
      );
    }
  }

  /**
   * Validate email address
   * @param {string} email - Email to validate
   * @param {object} options - Validation options
   * @returns {boolean} True if valid
   * @throws {ValidationError} If validation fails
   */
  static validateEmail(email, options = {}) {
    const { required = true } = options;

    if (!email) {
      if (required) {
        throw new ValidationError('Email is required', 'email');
      }
      return true;
    }

    // Basic email regex (RFC 5322 compliant would be much more complex)
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw new ValidationError(
        'Invalid email format',
        'email'
      );
    }

    // Check length
    if (email.length > 254) {
      throw new ValidationError(
        'Email is too long (max 254 characters)',
        'email'
      );
    }

    return true;
  }

  /**
   * Validate string length
   * @param {string} value - String to validate
   * @param {object} options - Validation options
   * @returns {boolean} True if valid
   * @throws {ValidationError} If validation fails
   */
  static validateLength(value, options = {}) {
    const {
      min = 0,
      max = Infinity,
      required = true,
      fieldName = 'Field'
    } = options;

    if (!value) {
      if (required) {
        throw new ValidationError(`${fieldName} is required`, 'length');
      }
      return true;
    }

    const length = value.length;

    if (length < min) {
      throw new ValidationError(
        `${fieldName} must be at least ${min} characters`,
        'length'
      );
    }

    if (length > max) {
      throw new ValidationError(
        `${fieldName} cannot exceed ${max} characters`,
        'length'
      );
    }

    return true;
  }

  /**
   * Generic form validation
   * @param {object} data - Form data to validate
   * @param {object} schema - Validation schema
   * @returns {boolean} True if valid
   * @throws {ValidationError} If validation fails
   */
  static validateForm(data, schema) {
    const errors = {};

    for (const [field, rules] of Object.entries(schema)) {
      try {
        const value = data[field];

        // Execute each validation rule
        for (const rule of rules) {
          if (typeof rule === 'function') {
            rule(value);
          } else {
            throw new Error('Validation rule must be a function');
          }
        }
      } catch (error) {
        if (error instanceof ValidationError) {
          errors[field] = error.message;
        } else {
          errors[field] = 'Validation failed';
          logger.error('Form validation error', {
            field,
            error: error.message
          });
        }
      }
    }

    // If there are errors, throw with all errors
    if (Object.keys(errors).length > 0) {
      throw new ValidationError('Form validation failed', null, errors);
    }

    return true;
  }

  /**
   * Sanitize user input for display (remove potential XSS)
   * @param {string} input - Input to sanitize
   * @returns {string} Sanitized input
   */
  static sanitizeInput(input) {
    if (!input || typeof input !== 'string') {
      return '';
    }

    // Escape HTML entities
    return input
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }
}
