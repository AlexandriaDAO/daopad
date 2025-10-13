import { BaseError } from './BaseError';

/**
 * Error class for DAOPad backend-related errors
 */
export class BackendError extends BaseError {
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, 'BACKEND_ERROR', cause, context);
  }

  getUserMessage(): string {
    // Map backend error patterns to user-friendly messages
    if (this.message.includes('not found')) {
      return 'The requested resource was not found.';
    }
    if (this.message.includes('unauthorized') || this.message.includes('permission')) {
      return 'You do not have permission to perform this action.';
    }
    if (this.message.includes('invalid')) {
      return 'The request was invalid. Please check your input.';
    }
    if (this.message.includes('already exists')) {
      return 'This resource already exists.';
    }

    return 'An error occurred while processing your request. Please try again.';
  }

  /**
   * Creates a BackendError from a backend response
   */
  static fromResponse(response: unknown, context?: Record<string, unknown>): BackendError {
    // Handle { success: false, error: string } pattern
    if (typeof response === 'object' && response !== null) {
      const obj = response as Record<string, unknown>;
      if ('error' in obj && typeof obj.error === 'string') {
        return new BackendError(obj.error, undefined, context);
      }
    }

    // Handle Error objects
    if (response instanceof Error) {
      return new BackendError(response.message, response, context);
    }

    // Handle string errors
    const message = typeof response === 'string' ? response : JSON.stringify(response);
    return new BackendError(message, undefined, context);
  }
}
