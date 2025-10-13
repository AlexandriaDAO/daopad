/**
 * Base error class for all application errors
 * Provides structured error information with user-friendly messages
 */
export abstract class BaseError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error,
    public readonly context?: Record<string, unknown>
  ) {
    super(message);
    this.name = this.constructor.name;

    // Maintain proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * Returns a user-friendly message suitable for display
   */
  abstract getUserMessage(): string;

  /**
   * Returns detailed error information for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      cause: this.cause?.message,
      stack: this.stack,
    };
  }
}
