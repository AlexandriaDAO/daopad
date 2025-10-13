/**
 * Result type for operations that can succeed or fail
 * Inspired by Rust's Result<T, E> and Railway Oriented Programming
 */
export type Result<T, E extends Error = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Result utilities for creating and working with Result types
 */
export const Result = {
  /**
   * Create a successful result
   */
  ok<T>(data: T): Result<T, never> {
    return { success: true, data };
  },

  /**
   * Create a failed result
   */
  err<E extends Error>(error: E): Result<never, E> {
    return { success: false, error };
  },

  /**
   * Check if result is successful
   */
  isOk<T, E extends Error>(result: Result<T, E>): result is { success: true; data: T } {
    return result.success === true;
  },

  /**
   * Check if result is an error
   */
  isErr<T, E extends Error>(result: Result<T, E>): result is { success: false; error: E } {
    return result.success === false;
  },

  /**
   * Map the data value if result is Ok
   */
  map<T, U, E extends Error>(
    result: Result<T, E>,
    fn: (data: T) => U
  ): Result<U, E> {
    if (Result.isOk(result)) {
      return Result.ok(fn(result.data));
    }
    return result;
  },

  /**
   * Map the error value if result is Err
   */
  mapErr<T, E extends Error, F extends Error>(
    result: Result<T, E>,
    fn: (error: E) => F
  ): Result<T, F> {
    if (Result.isErr(result)) {
      return Result.err(fn(result.error));
    }
    return result;
  },

  /**
   * Chain operations that return Results (flatMap)
   */
  andThen<T, U, E extends Error>(
    result: Result<T, E>,
    fn: (data: T) => Result<U, E>
  ): Result<U, E> {
    if (Result.isOk(result)) {
      return fn(result.data);
    }
    return result;
  },

  /**
   * Unwrap the data value or throw the error
   */
  unwrap<T, E extends Error>(result: Result<T, E>): T {
    if (Result.isOk(result)) {
      return result.data;
    }
    throw result.error;
  },

  /**
   * Unwrap the data value or return a default
   */
  unwrapOr<T, E extends Error>(result: Result<T, E>, defaultValue: T): T {
    if (Result.isOk(result)) {
      return result.data;
    }
    return defaultValue;
  },

  /**
   * Unwrap the data value or compute a default from the error
   */
  unwrapOrElse<T, E extends Error>(
    result: Result<T, E>,
    fn: (error: E) => T
  ): T {
    if (Result.isOk(result)) {
      return result.data;
    }
    return fn(result.error);
  },

  /**
   * Convert a Promise to a Result
   */
  async fromPromise<T, E extends Error = Error>(
    promise: Promise<T>,
    errorFactory: (error: unknown) => E
  ): Promise<Result<T, E>> {
    try {
      const data = await promise;
      return Result.ok(data);
    } catch (error) {
      return Result.err(errorFactory(error));
    }
  },

  /**
   * Combine multiple Results into a single Result with an array of data
   */
  all<T, E extends Error>(results: Result<T, E>[]): Result<T[], E> {
    const data: T[] = [];
    for (const result of results) {
      if (Result.isErr(result)) {
        return result;
      }
      data.push(result.data);
    }
    return Result.ok(data);
  },
};
