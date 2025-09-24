import { OrbitServiceBase } from '../OrbitServiceBase';

describe('OrbitServiceBase', () => {
  let base;
  let mockActor;

  beforeEach(() => {
    mockActor = {
      testMethod: jest.fn()
    };
    base = new OrbitServiceBase(mockActor, 'TestService');
  });

  describe('encodeOptional', () => {
    it('wraps non-null values in array', () => {
      expect(base.encodeOptional('test')).toEqual(['test']);
      expect(base.encodeOptional(0)).toEqual([0]);
      expect(base.encodeOptional(false)).toEqual([false]);
      expect(base.encodeOptional('')).toEqual(['']);
    });

    it('returns empty array for null/undefined', () => {
      expect(base.encodeOptional(null)).toEqual([]);
      expect(base.encodeOptional(undefined)).toEqual([]);
    });

    it('applies encoder function when provided', () => {
      const encoder = (v) => v.toUpperCase();
      expect(base.encodeOptional('test', encoder)).toEqual(['TEST']);
      expect(base.encodeOptional(null, encoder)).toEqual([]);
    });
  });

  describe('encodeOptionalArray', () => {
    it('wraps non-empty arrays', () => {
      expect(base.encodeOptionalArray([1, 2, 3])).toEqual([[1, 2, 3]]);
      expect(base.encodeOptionalArray(['a'])).toEqual([['a']]);
    });

    it('returns empty array for empty/null arrays', () => {
      expect(base.encodeOptionalArray([])).toEqual([]);
      expect(base.encodeOptionalArray(null)).toEqual([]);
      expect(base.encodeOptionalArray(undefined)).toEqual([]);
    });
  });

  describe('handleOrbitCall', () => {
    it('handles double-wrapped success results', async () => {
      mockActor.testMethod.mockResolvedValue({
        Ok: { Ok: { data: 'success' } }
      });

      const result = await base.handleOrbitCall('testMethod', {});
      expect(result).toEqual({ data: 'success' });
    });

    it('handles single-wrapped success results', async () => {
      mockActor.testMethod.mockResolvedValue({
        Ok: { data: 'success' }
      });

      const result = await base.handleOrbitCall('testMethod', {});
      expect(result).toEqual({ data: 'success' });
    });

    it('handles inner error results', async () => {
      mockActor.testMethod.mockResolvedValue({
        Ok: { Err: { message: 'Inner error' } }
      });

      await expect(base.handleOrbitCall('testMethod', {}))
        .rejects.toThrow('Inner error');
    });

    it('handles outer error results', async () => {
      mockActor.testMethod.mockResolvedValue({
        Err: { message: 'Outer error' }
      });

      await expect(base.handleOrbitCall('testMethod', {}))
        .rejects.toThrow('Outer error');
    });

    it('applies decoder function to results', async () => {
      mockActor.testMethod.mockResolvedValue({
        Ok: { value: 123 }
      });

      const decoder = (result) => ({ decoded: result.value * 2 });
      const result = await base.handleOrbitCall('testMethod', {}, decoder);
      expect(result).toEqual({ decoded: 246 });
    });

    it('logs method calls in development', async () => {
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      mockActor.testMethod.mockResolvedValue({ Ok: 'test' });

      await base.handleOrbitCall('testMethod', { param: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith(
        '[TestService] Calling testMethod:',
        { param: 'value' }
      );
      consoleSpy.mockRestore();
    });
  });

  describe('encodePagination', () => {
    it('returns default pagination when no input', () => {
      expect(base.encodePagination()).toEqual({
        offset: [0],
        limit: [100]
      });
    });

    it('encodes provided pagination values', () => {
      expect(base.encodePagination({ offset: 50, limit: 25 })).toEqual({
        offset: [50],
        limit: [25]
      });
    });

    it('uses defaults for missing values', () => {
      expect(base.encodePagination({ offset: 10 })).toEqual({
        offset: [10],
        limit: [100]
      });
      expect(base.encodePagination({ limit: 50 })).toEqual({
        offset: [0],
        limit: [50]
      });
    });
  });

  describe('encodeTimestamp', () => {
    it('converts Date to nanoseconds', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const expectedNanos = BigInt(date.getTime() * 1000000);
      expect(base.encodeTimestamp(date)).toEqual([expectedNanos]);
    });

    it('converts timestamp number to nanoseconds', () => {
      const timestamp = 1704067200000; // 2024-01-01
      const expectedNanos = BigInt(timestamp * 1000000);
      expect(base.encodeTimestamp(timestamp)).toEqual([expectedNanos]);
    });

    it('returns empty array for null/undefined', () => {
      expect(base.encodeTimestamp(null)).toEqual([]);
      expect(base.encodeTimestamp(undefined)).toEqual([]);
    });
  });

  describe('decodeTimestamp', () => {
    it('converts nanoseconds to Date', () => {
      const nanos = BigInt(1704067200000 * 1000000);
      const result = base.decodeTimestamp(nanos);
      expect(result).toBeInstanceOf(Date);
      expect(result.toISOString()).toBe('2024-01-01T00:00:00.000Z');
    });

    it('returns null for null/undefined', () => {
      expect(base.decodeTimestamp(null)).toBeNull();
      expect(base.decodeTimestamp(undefined)).toBeNull();
    });
  });

  describe('UUID validation', () => {
    it('validates correct UUIDs', () => {
      expect(base.isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(base.isValidUUID('00000000-0000-0000-0000-000000000000')).toBe(true);
    });

    it('rejects invalid UUIDs', () => {
      expect(base.isValidUUID('not-a-uuid')).toBe(false);
      expect(base.isValidUUID('123e4567-e89b-12d3-a456')).toBe(false);
      expect(base.isValidUUID('')).toBe(false);
    });
  });

  describe('Principal validation', () => {
    it('validates principal formats', () => {
      expect(base.isValidPrincipal('aaaaa-aa')).toBe(true);
      expect(base.isValidPrincipal('ryjl3-tyaaa-aaaaa-aaaba-cai')).toBe(true);
    });

    it('validates Principal objects', () => {
      const mockPrincipal = { toText: () => 'aaaaa-aa' };
      expect(base.isValidPrincipal(mockPrincipal)).toBe(true);
    });

    it('rejects invalid principals', () => {
      expect(base.isValidPrincipal('invalid')).toBe(false);
      expect(base.isValidPrincipal('')).toBe(false);
      expect(base.isValidPrincipal(123)).toBe(false);
    });
  });

  describe('Cache management', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('stores and retrieves cached data', () => {
      base.setCache('key1', { value: 'data' });
      expect(base.getCached('key1')).toEqual({ value: 'data' });
    });

    it('returns null for expired cache', () => {
      base.setCache('key1', { value: 'data' });
      jest.advanceTimersByTime(6000); // Advance past 5s timeout
      expect(base.getCached('key1')).toBeNull();
    });

    it('clears all cache', () => {
      base.setCache('key1', 'data1');
      base.setCache('key2', 'data2');
      base.clearCache();
      expect(base.getCached('key1')).toBeNull();
      expect(base.getCached('key2')).toBeNull();
    });
  });

  describe('buildRequestInput', () => {
    it('builds request input with all fields', () => {
      const result = base.buildRequestInput(
        { Transfer: {} },
        'Transfer funds',
        ['Summary text'],
        ['Step 1', 'Step 2']
      );

      expect(result).toEqual({
        operation: { Transfer: {} },
        title: ['Transfer funds'],
        summary: ['Summary text'],
        execution_plan: ['Step 1', 'Step 2']
      });
    });

    it('handles title as array', () => {
      const result = base.buildRequestInput(
        { Transfer: {} },
        ['Transfer funds']
      );

      expect(result.title).toEqual(['Transfer funds']);
    });

    it('uses empty arrays for missing optional fields', () => {
      const result = base.buildRequestInput(
        { Transfer: {} },
        'Transfer'
      );

      expect(result.summary).toEqual([]);
      expect(result.execution_plan).toEqual([]);
    });
  });

  describe('encodeMetadata', () => {
    it('encodes metadata array', () => {
      const metadata = [
        { key: 'key1', value: 'value1' },
        { key: 'key2', value: 'value2' }
      ];

      expect(base.encodeMetadata(metadata)).toEqual([metadata]);
    });

    it('returns empty array for null/empty metadata', () => {
      expect(base.encodeMetadata(null)).toEqual([]);
      expect(base.encodeMetadata([])).toEqual([]);
      expect(base.encodeMetadata(undefined)).toEqual([]);
    });
  });

  describe('encodeSortingCriteria', () => {
    it('encodes createdAt sorting', () => {
      expect(base.encodeSortingCriteria({ createdAt: 'asc' })).toEqual([
        { CreatedAt: { Asc: null } }
      ]);
      expect(base.encodeSortingCriteria({ createdAt: 'desc' })).toEqual([
        { CreatedAt: { Desc: null } }
      ]);
    });

    it('encodes expirationDt sorting', () => {
      expect(base.encodeSortingCriteria({ expirationDt: 'asc' })).toEqual([
        { ExpirationDt: { Asc: null } }
      ]);
    });

    it('encodes lastModified sorting', () => {
      expect(base.encodeSortingCriteria({ lastModified: 'desc' })).toEqual([
        { LastModificationDt: { Desc: null } }
      ]);
    });

    it('returns empty array for no sorting', () => {
      expect(base.encodeSortingCriteria(null)).toEqual([]);
      expect(base.encodeSortingCriteria({})).toEqual([]);
    });
  });

  describe('encodeRequestStatuses', () => {
    it('encodes status names to variants', () => {
      const result = base.encodeRequestStatuses(['created', 'processing']);
      expect(result).toEqual([[
        { Created: null },
        { Processing: null }
      ]]);
    });

    it('handles mixed case status names', () => {
      const result = base.encodeRequestStatuses(['Created', 'PROCESSING']);
      expect(result).toEqual([[
        { Created: null },
        { Processing: null }
      ]]);
    });

    it('returns empty array for no statuses', () => {
      expect(base.encodeRequestStatuses(null)).toEqual([]);
      expect(base.encodeRequestStatuses([])).toEqual([]);
    });
  });

  describe('extractPaginatedResult', () => {
    it('extracts pagination info from result', () => {
      const result = {
        items: [1, 2, 3],
        total: BigInt(100),
        next_offset: [BigInt(50)]
      };

      expect(base.extractPaginatedResult(result)).toEqual({
        items: [1, 2, 3],
        total: 100,
        nextOffset: 50
      });
    });

    it('handles missing fields gracefully', () => {
      expect(base.extractPaginatedResult({})).toEqual({
        items: [],
        total: 0,
        nextOffset: null
      });
    });

    it('uses custom items key', () => {
      const result = {
        entries: ['a', 'b'],
        total: BigInt(2)
      };

      expect(base.extractPaginatedResult(result, 'entries')).toEqual({
        items: ['a', 'b'],
        total: 2,
        nextOffset: null
      });
    });
  });

  describe('Blockchain validation', () => {
    it('validates known blockchains', () => {
      expect(base.isValidBlockchain('icp')).toBe(true);
      expect(base.isValidBlockchain('eth')).toBe(true);
      expect(base.isValidBlockchain('btc')).toBe(true);
    });

    it('rejects unknown blockchains', () => {
      expect(base.isValidBlockchain('unknown')).toBe(false);
      expect(base.isValidBlockchain('')).toBe(false);
      expect(base.isValidBlockchain(null)).toBe(false);
    });
  });

  describe('detectAddressFormat', () => {
    describe('ICP addresses', () => {
      it('detects account identifier', () => {
        const addr = '0'.repeat(64);
        expect(base.detectAddressFormat(addr, 'icp')).toBe('icp_account_identifier');
      });

      it('detects ICRC1 account', () => {
        expect(base.detectAddressFormat('aaaaa-aa-subaccount', 'icp')).toBe('icrc1_account');
      });
    });

    describe('Ethereum addresses', () => {
      it('detects ETH address', () => {
        const addr = '0x' + '0'.repeat(40);
        expect(base.detectAddressFormat(addr, 'eth')).toBe('ethereum_address');
      });
    });

    describe('Bitcoin addresses', () => {
      it('detects P2WPKH address', () => {
        const addr = 'bc1' + '0'.repeat(39);
        expect(base.detectAddressFormat(addr, 'btc')).toBe('bitcoin_address_p2wpkh');
      });

      it('detects P2TR address', () => {
        const addr = 'bc1p' + '0'.repeat(58);
        expect(base.detectAddressFormat(addr, 'btc')).toBe('bitcoin_address_p2tr');
      });
    });

    it('returns null for invalid formats', () => {
      expect(base.detectAddressFormat('invalid', 'icp')).toBeNull();
      expect(base.detectAddressFormat('0x123', 'eth')).toBeNull();
    });
  });

  describe('handleError', () => {
    it('preserves structured errors', () => {
      const error = {
        code: 'TEST_ERROR',
        message: 'Test message',
        details: ['detail1']
      };

      expect(base.handleError(error)).toEqual(error);
    });

    it('converts string errors to structured format', () => {
      expect(base.handleError('Simple error')).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'Simple error',
        details: []
      });
    });

    it('converts Error objects to structured format', () => {
      const error = new Error('Test error');
      expect(base.handleError(error)).toEqual({
        code: 'UNKNOWN_ERROR',
        message: 'Error: Test error',
        details: []
      });
    });
  });
});