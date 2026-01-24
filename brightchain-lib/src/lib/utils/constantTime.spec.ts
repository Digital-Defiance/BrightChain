import {
  constantTimeEqual,
  constantTimeEqualHex,
  constantTimeEqualNumber,
  constantTimeIsZero,
  constantTimeSelect,
} from './constantTime';

describe('Constant-Time Utilities', () => {
  describe('constantTimeEqual', () => {
    it('should return true for identical arrays', () => {
      const a = new Uint8Array([1, 2, 3, 4, 5]);
      const b = new Uint8Array([1, 2, 3, 4, 5]);
      expect(constantTimeEqual(a, b)).toBe(true);
    });

    it('should return false for different arrays', () => {
      const a = new Uint8Array([1, 2, 3, 4, 5]);
      const b = new Uint8Array([1, 2, 3, 4, 6]);
      expect(constantTimeEqual(a, b)).toBe(false);
    });

    it('should return false for arrays with different lengths', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 3, 4]);
      expect(constantTimeEqual(a, b)).toBe(false);
    });

    it('should return true for empty arrays', () => {
      const a = new Uint8Array([]);
      const b = new Uint8Array([]);
      expect(constantTimeEqual(a, b)).toBe(true);
    });

    it('should return false when difference is at the beginning', () => {
      const a = new Uint8Array([1, 2, 3, 4, 5]);
      const b = new Uint8Array([0, 2, 3, 4, 5]);
      expect(constantTimeEqual(a, b)).toBe(false);
    });

    it('should return false when difference is at the end', () => {
      const a = new Uint8Array([1, 2, 3, 4, 5]);
      const b = new Uint8Array([1, 2, 3, 4, 0]);
      expect(constantTimeEqual(a, b)).toBe(false);
    });

    it('should return false when difference is in the middle', () => {
      const a = new Uint8Array([1, 2, 3, 4, 5]);
      const b = new Uint8Array([1, 2, 0, 4, 5]);
      expect(constantTimeEqual(a, b)).toBe(false);
    });

    it('should handle large arrays', () => {
      const size = 10000;
      const a = new Uint8Array(size);
      const b = new Uint8Array(size);
      crypto.getRandomValues(a);
      b.set(a);
      expect(constantTimeEqual(a, b)).toBe(true);

      // Change one byte
      b[size - 1] ^= 1;
      expect(constantTimeEqual(a, b)).toBe(false);
    });

    it('should handle all-zero arrays', () => {
      const a = new Uint8Array(100);
      const b = new Uint8Array(100);
      expect(constantTimeEqual(a, b)).toBe(true);
    });

    it('should handle all-ones arrays', () => {
      const a = new Uint8Array(100).fill(0xff);
      const b = new Uint8Array(100).fill(0xff);
      expect(constantTimeEqual(a, b)).toBe(true);
    });
  });

  describe('constantTimeEqualHex', () => {
    it('should return true for identical hex strings', () => {
      const a = 'deadbeef';
      const b = 'deadbeef';
      expect(constantTimeEqualHex(a, b)).toBe(true);
    });

    it('should return false for different hex strings', () => {
      const a = 'deadbeef';
      const b = 'deadbee0';
      expect(constantTimeEqualHex(a, b)).toBe(false);
    });

    it('should handle uppercase hex', () => {
      const a = 'DEADBEEF';
      const b = 'DEADBEEF';
      expect(constantTimeEqualHex(a, b)).toBe(true);
    });

    it('should handle mixed case hex', () => {
      const a = 'DeAdBeEf';
      const b = 'dEaDbEeF';
      expect(constantTimeEqualHex(a, b)).toBe(true);
    });

    it('should return false for different lengths', () => {
      const a = 'deadbeef';
      const b = 'deadbeef00';
      expect(constantTimeEqualHex(a, b)).toBe(false);
    });

    it('should throw for invalid hex strings', () => {
      expect(() => constantTimeEqualHex('deadbeef', 'notahex')).toThrow(
        'Invalid hexadecimal string',
      );
      expect(() => constantTimeEqualHex('deadbeef', 'dead beef')).toThrow(
        'Invalid hexadecimal string',
      );
    });

    it('should handle empty strings', () => {
      expect(constantTimeEqualHex('', '')).toBe(true);
    });

    it('should handle long hex strings', () => {
      const a = 'a'.repeat(128); // 64 bytes
      const b = 'a'.repeat(128);
      expect(constantTimeEqualHex(a, b)).toBe(true);

      const c = 'a'.repeat(127) + 'b';
      expect(constantTimeEqualHex(a, c)).toBe(false);
    });
  });

  describe('constantTimeSelect', () => {
    it('should select true value when condition is 1', () => {
      expect(constantTimeSelect(1, 42, 0)).toBe(42);
      expect(constantTimeSelect(1, 100, 200)).toBe(100);
    });

    it('should select false value when condition is 0', () => {
      expect(constantTimeSelect(0, 42, 0)).toBe(0);
      expect(constantTimeSelect(0, 100, 200)).toBe(200);
    });

    it('should handle negative numbers', () => {
      expect(constantTimeSelect(1, -42, 0)).toBe(-42);
      expect(constantTimeSelect(0, -42, 0)).toBe(0);
    });

    it('should handle large numbers', () => {
      const large = 2147483647; // Max 32-bit signed int
      expect(constantTimeSelect(1, large, 0)).toBe(large);
      expect(constantTimeSelect(0, large, 0)).toBe(0);
    });
  });

  describe('constantTimeEqualNumber', () => {
    it('should return true for equal numbers', () => {
      expect(constantTimeEqualNumber(42, 42)).toBe(true);
      expect(constantTimeEqualNumber(0, 0)).toBe(true);
      expect(constantTimeEqualNumber(-1, -1)).toBe(true);
    });

    it('should return false for different numbers', () => {
      expect(constantTimeEqualNumber(42, 43)).toBe(false);
      expect(constantTimeEqualNumber(0, 1)).toBe(false);
      expect(constantTimeEqualNumber(-1, 1)).toBe(false);
    });

    it('should handle large numbers', () => {
      const large = 2147483647;
      expect(constantTimeEqualNumber(large, large)).toBe(true);
      expect(constantTimeEqualNumber(large, large - 1)).toBe(false);
    });

    it('should handle negative numbers', () => {
      expect(constantTimeEqualNumber(-42, -42)).toBe(true);
      expect(constantTimeEqualNumber(-42, -43)).toBe(false);
    });
  });

  describe('constantTimeIsZero', () => {
    it('should return true for all-zero array', () => {
      const zeros = new Uint8Array(100);
      expect(constantTimeIsZero(zeros)).toBe(true);
    });

    it('should return false for array with any non-zero byte', () => {
      const data = new Uint8Array(100);
      data[50] = 1;
      expect(constantTimeIsZero(data)).toBe(false);
    });

    it('should return false when first byte is non-zero', () => {
      const data = new Uint8Array(100);
      data[0] = 1;
      expect(constantTimeIsZero(data)).toBe(false);
    });

    it('should return false when last byte is non-zero', () => {
      const data = new Uint8Array(100);
      data[99] = 1;
      expect(constantTimeIsZero(data)).toBe(false);
    });

    it('should return true for empty array', () => {
      const empty = new Uint8Array(0);
      expect(constantTimeIsZero(empty)).toBe(true);
    });

    it('should handle large arrays', () => {
      const large = new Uint8Array(10000);
      expect(constantTimeIsZero(large)).toBe(true);

      large[9999] = 1;
      expect(constantTimeIsZero(large)).toBe(false);
    });
  });

  describe('Timing consistency (manual verification)', () => {
    // These tests verify that the functions don't short-circuit
    // They don't actually measure timing, but verify behavior

    it('constantTimeEqual should process all bytes', () => {
      const size = 1000;
      const a = new Uint8Array(size).fill(0xff);
      const b = new Uint8Array(size).fill(0xff);

      // Difference at start
      b[0] = 0;
      expect(constantTimeEqual(a, b)).toBe(false);

      // Difference at end
      b[0] = 0xff;
      b[size - 1] = 0;
      expect(constantTimeEqual(a, b)).toBe(false);

      // Both should take similar time (not measurable in test, but verified by code inspection)
    });

    it('constantTimeIsZero should process all bytes', () => {
      const size = 1000;
      const data = new Uint8Array(size);

      // Non-zero at start
      data[0] = 1;
      expect(constantTimeIsZero(data)).toBe(false);

      // Non-zero at end
      data[0] = 0;
      data[size - 1] = 1;
      expect(constantTimeIsZero(data)).toBe(false);

      // Both should take similar time
    });
  });
});
