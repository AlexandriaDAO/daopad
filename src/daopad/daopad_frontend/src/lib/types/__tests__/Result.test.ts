import { describe, it, expect } from 'vitest';
import { Result } from '../Result';

describe('Result', () => {
  describe('ok', () => {
    it('should create a successful result', () => {
      const result = Result.ok(42);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toBe(42);
      }
    });
  });

  describe('err', () => {
    it('should create a failed result', () => {
      const error = new Error('test error');
      const result = Result.err(error);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(error);
      }
    });
  });

  describe('isOk', () => {
    it('should return true for successful result', () => {
      const result = Result.ok(42);
      expect(Result.isOk(result)).toBe(true);
    });

    it('should return false for failed result', () => {
      const result = Result.err(new Error('test'));
      expect(Result.isOk(result)).toBe(false);
    });
  });

  describe('isErr', () => {
    it('should return true for failed result', () => {
      const result = Result.err(new Error('test'));
      expect(Result.isErr(result)).toBe(true);
    });

    it('should return false for successful result', () => {
      const result = Result.ok(42);
      expect(Result.isErr(result)).toBe(false);
    });
  });

  describe('map', () => {
    it('should transform successful result', () => {
      const result = Result.ok(21);
      const mapped = Result.map(result, (x) => x * 2);
      expect(Result.isOk(mapped)).toBe(true);
      if (Result.isOk(mapped)) {
        expect(mapped.data).toBe(42);
      }
    });

    it('should not transform failed result', () => {
      const error = new Error('test');
      const result = Result.err(error);
      const mapped = Result.map(result, (x: number) => x * 2);
      expect(Result.isErr(mapped)).toBe(true);
      if (Result.isErr(mapped)) {
        expect(mapped.error).toBe(error);
      }
    });
  });

  describe('mapErr', () => {
    it('should transform error in failed result', () => {
      const result = Result.err(new Error('original'));
      const mapped = Result.mapErr(result, (err) => new Error(`mapped: ${err.message}`));
      expect(Result.isErr(mapped)).toBe(true);
      if (Result.isErr(mapped)) {
        expect(mapped.error.message).toBe('mapped: original');
      }
    });

    it('should not transform successful result', () => {
      const result = Result.ok(42);
      const mapped = Result.mapErr(result, (err) => new Error(`mapped: ${err.message}`));
      expect(Result.isOk(mapped)).toBe(true);
      if (Result.isOk(mapped)) {
        expect(mapped.data).toBe(42);
      }
    });
  });

  describe('andThen', () => {
    it('should chain successful operations', () => {
      const result = Result.ok(21);
      const chained = Result.andThen(result, (x) => Result.ok(x * 2));
      expect(Result.isOk(chained)).toBe(true);
      if (Result.isOk(chained)) {
        expect(chained.data).toBe(42);
      }
    });

    it('should stop chain on first error', () => {
      const result = Result.ok(21);
      const error = new Error('chain error');
      const chained = Result.andThen(result, () => Result.err(error));
      expect(Result.isErr(chained)).toBe(true);
      if (Result.isErr(chained)) {
        expect(chained.error).toBe(error);
      }
    });

    it('should not execute function for failed result', () => {
      const error = new Error('original');
      const result = Result.err(error);
      let executed = false;
      const chained = Result.andThen(result, () => {
        executed = true;
        return Result.ok(42);
      });
      expect(executed).toBe(false);
      expect(Result.isErr(chained)).toBe(true);
    });
  });

  describe('unwrap', () => {
    it('should return data for successful result', () => {
      const result = Result.ok(42);
      expect(Result.unwrap(result)).toBe(42);
    });

    it('should throw error for failed result', () => {
      const error = new Error('test error');
      const result = Result.err(error);
      expect(() => Result.unwrap(result)).toThrow(error);
    });
  });

  describe('unwrapOr', () => {
    it('should return data for successful result', () => {
      const result = Result.ok(42);
      expect(Result.unwrapOr(result, 0)).toBe(42);
    });

    it('should return default for failed result', () => {
      const result = Result.err(new Error('test'));
      expect(Result.unwrapOr(result, 0)).toBe(0);
    });
  });

  describe('unwrapOrElse', () => {
    it('should return data for successful result', () => {
      const result = Result.ok(42);
      expect(Result.unwrapOrElse(result, () => 0)).toBe(42);
    });

    it('should compute default for failed result', () => {
      const result = Result.err(new Error('test'));
      expect(Result.unwrapOrElse(result, (err) => err.message.length)).toBe(4);
    });
  });

  describe('fromPromise', () => {
    it('should convert resolved promise to Ok', async () => {
      const promise = Promise.resolve(42);
      const result = await Result.fromPromise(promise, (err) => new Error(String(err)));
      expect(Result.isOk(result)).toBe(true);
      if (Result.isOk(result)) {
        expect(result.data).toBe(42);
      }
    });

    it('should convert rejected promise to Err', async () => {
      const promise = Promise.reject(new Error('test'));
      const result = await Result.fromPromise(promise, (err) => err as Error);
      expect(Result.isErr(result)).toBe(true);
      if (Result.isErr(result)) {
        expect(result.error.message).toBe('test');
      }
    });
  });

  describe('all', () => {
    it('should combine all successful results', () => {
      const results = [Result.ok(1), Result.ok(2), Result.ok(3)];
      const combined = Result.all(results);
      expect(Result.isOk(combined)).toBe(true);
      if (Result.isOk(combined)) {
        expect(combined.data).toEqual([1, 2, 3]);
      }
    });

    it('should return first error', () => {
      const error = new Error('test');
      const results = [Result.ok(1), Result.err(error), Result.ok(3)];
      const combined = Result.all(results);
      expect(Result.isErr(combined)).toBe(true);
      if (Result.isErr(combined)) {
        expect(combined.error).toBe(error);
      }
    });

    it('should handle empty array', () => {
      const results: Result<number, Error>[] = [];
      const combined = Result.all(results);
      expect(Result.isOk(combined)).toBe(true);
      if (Result.isOk(combined)) {
        expect(combined.data).toEqual([]);
      }
    });
  });
});
