import { BaseError } from './BaseError';

/**
 * Error class for Orbit Station-related errors
 */
export class OrbitError extends BaseError {
  constructor(
    message: string,
    cause?: Error,
    context?: Record<string, unknown>
  ) {
    super(message, 'ORBIT_ERROR', cause, context);
  }

  getUserMessage(): string {
    // Map Orbit error codes to user-friendly messages
    if (this.message.includes('not found')) {
      return 'The requested resource was not found in Orbit Station.';
    }
    if (this.message.includes('permission') || this.message.includes('unauthorized')) {
      return 'You do not have permission to access this Orbit Station resource.';
    }
    if (this.message.includes('invalid request')) {
      return 'The request to Orbit Station was invalid. Please check your input.';
    }
    if (this.message.includes('duplicate')) {
      return 'This request already exists in Orbit Station.';
    }

    return 'An error occurred while communicating with Orbit Station. Please try again.';
  }

  /**
   * Creates an OrbitError from Orbit's error response
   * Orbit returns errors in various formats depending on the operation
   */
  static fromOrbitResponse(response: unknown, context?: Record<string, unknown>): OrbitError {
    // Handle Orbit's Result::Err variant
    if (typeof response === 'object' && response !== null && 'Err' in response) {
      const err = (response as { Err: unknown }).Err;
      const message = typeof err === 'string' ? err : JSON.stringify(err);
      return new OrbitError(message, undefined, context);
    }

    // Handle raw error objects
    if (response instanceof Error) {
      return new OrbitError(response.message, response, context);
    }

    // Handle string errors
    const message = typeof response === 'string' ? response : JSON.stringify(response);
    return new OrbitError(message, undefined, context);
  }
}
