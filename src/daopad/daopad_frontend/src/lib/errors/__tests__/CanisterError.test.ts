import { describe, it, expect } from 'vitest';
import { CanisterError } from '../CanisterError';

describe('CanisterError', () => {
  it('should create error with message', () => {
    const error = new CanisterError('Test error');
    expect(error.message).toBe('Test error');
    expect(error.code).toBe('CANISTER_ERROR');
    expect(error.name).toBe('CanisterError');
  });

  it('should create error with cause', () => {
    const cause = new Error('Root cause');
    const error = new CanisterError('Test error', cause);
    expect(error.cause).toBe(cause);
  });

  it('should create error with context', () => {
    const context = { canisterId: 'abc-123' };
    const error = new CanisterError('Test error', undefined, context);
    expect(error.context).toEqual(context);
  });

  describe('getUserMessage', () => {
    it('should return friendly message for rejected calls', () => {
      const cause = new Error('Canister rejected the message');
      const error = new CanisterError('Test', cause);
      expect(error.getUserMessage()).toBe(
        'The operation was rejected by the canister. Please try again.'
      );
    });

    it('should return friendly message for replica errors', () => {
      const cause = new Error('replica error');
      const error = new CanisterError('Test', cause);
      expect(error.getUserMessage()).toBe(
        'Unable to connect to the Internet Computer. Please check your connection.'
      );
    });

    it('should return friendly message for timeouts', () => {
      const cause = new Error('Request timeout');
      const error = new CanisterError('Test', cause);
      expect(error.getUserMessage()).toBe('The request timed out. Please try again.');
    });

    it('should return friendly message for unauthorized', () => {
      const cause = new Error('Access unauthorized');
      const error = new CanisterError('Test', cause);
      expect(error.getUserMessage()).toBe(
        'You do not have permission to perform this action.'
      );
    });

    it('should return generic message for unknown errors', () => {
      const error = new CanisterError('Unknown error');
      expect(error.getUserMessage()).toBe(
        'An error occurred while communicating with the canister. Please try again.'
      );
    });
  });

  describe('fromRejection', () => {
    it('should create error from Error object', () => {
      const cause = new Error('Test error');
      const error = CanisterError.fromRejection(cause);
      expect(error).toBeInstanceOf(CanisterError);
      expect(error.message).toBe('Test error');
      expect(error.cause).toBe(cause);
    });

    it('should create error from string', () => {
      const error = CanisterError.fromRejection('Test error');
      expect(error).toBeInstanceOf(CanisterError);
      expect(error.message).toBe('Test error');
    });

    it('should create error from object', () => {
      const rejection = { code: 'ERR', message: 'Test' };
      const error = CanisterError.fromRejection(rejection);
      expect(error).toBeInstanceOf(CanisterError);
      expect(error.message).toBe(JSON.stringify(rejection));
    });

    it('should include context', () => {
      const context = { canisterId: 'test-123' };
      const error = CanisterError.fromRejection('Test', context);
      expect(error.context).toEqual(context);
    });
  });

  describe('toJSON', () => {
    it('should serialize error', () => {
      const cause = new Error('Cause error');
      const context = { canisterId: 'test' };
      const error = new CanisterError('Test error', cause, context);
      const json = error.toJSON();

      expect(json.name).toBe('CanisterError');
      expect(json.message).toBe('Test error');
      expect(json.code).toBe('CANISTER_ERROR');
      expect(json.context).toEqual(context);
      expect(json.cause).toBe('Cause error');
    });
  });
});
