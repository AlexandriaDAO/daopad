import { BaseError } from './BaseError';

/**
 * Error class for Internet Computer canister-related errors
 */
export class CanisterError extends BaseError {
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, 'CANISTER_ERROR', cause, context);
  }

  getUserMessage(): string {
    // Extract user-friendly message from IC error codes
    if (this.cause?.message?.includes('Canister rejected')) {
      return 'The operation was rejected by the canister. Please try again.';
    }
    if (this.cause?.message?.includes('replica')) {
      return 'Unable to connect to the Internet Computer. Please check your connection.';
    }
    if (this.cause?.message?.includes('timeout')) {
      return 'The request timed out. Please try again.';
    }
    if (this.cause?.message?.includes('unauthorized') || this.cause?.message?.includes('denied')) {
      return 'You do not have permission to perform this action.';
    }

    return 'An error occurred while communicating with the canister. Please try again.';
  }

  /**
   * Creates a CanisterError from a rejection reason
   */
  static fromRejection(rejection: unknown, context?: Record<string, unknown>): CanisterError {
    if (rejection instanceof Error) {
      return new CanisterError(rejection.message, rejection, context);
    }

    const message = typeof rejection === 'string' ? rejection : JSON.stringify(rejection);
    return new CanisterError(message, undefined, context);
  }
}
