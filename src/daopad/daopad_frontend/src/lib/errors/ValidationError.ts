import { BaseError } from './BaseError';

/**
 * Error class for validation failures
 */
export class ValidationError extends BaseError {
  constructor(
    message: string,
    public readonly field?: string,
    context?: Record<string, unknown>
  ) {
    super(message, 'VALIDATION_ERROR', undefined, { ...context, field });
  }

  getUserMessage(): string {
    if (this.field) {
      return `${this.field}: ${this.message}`;
    }
    return this.message;
  }

  /**
   * Creates a ValidationError for a specific field
   */
  static forField(field: string, message: string): ValidationError {
    return new ValidationError(message, field);
  }

  /**
   * Creates a ValidationError for multiple fields
   */
  static forFields(errors: Record<string, string>): ValidationError[] {
    return Object.entries(errors).map(([field, message]) =>
      new ValidationError(message, field)
    );
  }
}
