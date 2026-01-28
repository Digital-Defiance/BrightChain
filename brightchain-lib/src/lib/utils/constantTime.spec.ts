import {
  constantTimeEqual,
  constantTimeEqualArray,
  constantTimeEqualBuffer,
} from './constantTime';

describe('Constant-Time Comparisons', () => {
  describe('constantTimeEqual', () => {
    it('should return true for equal Uint8Arrays', () => {
      const a = new Uint8Array([1, 2, 3, 4]);
      const b = new Uint8Array([1, 2, 3, 4]);
      expect(constantTimeEqual(a, b)).toBe(true);
    });

    it('should return false for different Uint8Arrays', () => {
      const a = new Uint8Array([1, 2, 3, 4]);
      const b = new Uint8Array([1, 2, 3, 5]);
      expect(constantTimeEqual(a, b)).toBe(false);
    });

    it('should return false for different length arrays', () => {
      const a = new Uint8Array([1, 2, 3]);
      const b = new Uint8Array([1, 2, 3, 4]);
      expect(constantTimeEqual(a, b)).toBe(false);
    });

    it('should return true for empty arrays', () => {
      const a = new Uint8Array([]);
      const b = new Uint8Array([]);
      expect(constantTimeEqual(a, b)).toBe(true);
    });

    it('should handle single byte arrays', () => {
      const a = new Uint8Array([42]);
      const b = new Uint8Array([42]);
      expect(constantTimeEqual(a, b)).toBe(true);
    });
  });

  describe('constantTimeEqualBuffer', () => {
    it('should return true for equal Buffers', () => {
      const a = Buffer.from([1, 2, 3, 4]);
      const b = Buffer.from([1, 2, 3, 4]);
      expect(constantTimeEqualBuffer(a, b)).toBe(true);
    });

    it('should return false for different Buffers', () => {
      const a = Buffer.from([1, 2, 3, 4]);
      const b = Buffer.from([1, 2, 3, 5]);
      expect(constantTimeEqualBuffer(a, b)).toBe(false);
    });

    it('should return false for different length buffers', () => {
      const a = Buffer.from([1, 2, 3]);
      const b = Buffer.from([1, 2, 3, 4]);
      expect(constantTimeEqualBuffer(a, b)).toBe(false);
    });

    it('should return true for empty buffers', () => {
      const a = Buffer.from([]);
      const b = Buffer.from([]);
      expect(constantTimeEqualBuffer(a, b)).toBe(true);
    });
  });

  describe('constantTimeEqualArray', () => {
    it('should return true for equal number arrays', () => {
      const a = [1, 2, 3, 4];
      const b = [1, 2, 3, 4];
      expect(constantTimeEqualArray(a, b)).toBe(true);
    });

    it('should return false for different number arrays', () => {
      const a = [1, 2, 3, 4];
      const b = [1, 2, 3, 5];
      expect(constantTimeEqualArray(a, b)).toBe(false);
    });

    it('should return false for different length arrays', () => {
      const a = [1, 2, 3];
      const b = [1, 2, 3, 4];
      expect(constantTimeEqualArray(a, b)).toBe(false);
    });

    it('should return true for empty arrays', () => {
      const a: number[] = [];
      const b: number[] = [];
      expect(constantTimeEqualArray(a, b)).toBe(true);
    });
  });

  describe('Timing Consistency', () => {
    it('should take similar time for equal and unequal arrays', () => {
      const size = 1000;
      const a = new Uint8Array(size).fill(1);
      const bEqual = new Uint8Array(size).fill(1);
      const bDifferent = new Uint8Array(size).fill(1);
      bDifferent[size - 1] = 2; // Different at last position

      const iterations = 1000;

      // Warm up
      for (let i = 0; i < 100; i++) {
        constantTimeEqual(a, bEqual);
        constantTimeEqual(a, bDifferent);
      }

      // Measure equal comparison
      const startEqual = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        constantTimeEqual(a, bEqual);
      }
      const endEqual = process.hrtime.bigint();
      const timeEqual = Number(endEqual - startEqual);

      // Measure unequal comparison
      const startDifferent = process.hrtime.bigint();
      for (let i = 0; i < iterations; i++) {
        constantTimeEqual(a, bDifferent);
      }
      const endDifferent = process.hrtime.bigint();
      const timeDifferent = Number(endDifferent - startDifferent);

      // Times should be within 100% of each other (timing tests are inherently flaky)
      const ratio =
        Math.max(timeEqual, timeDifferent) / Math.min(timeEqual, timeDifferent);
      expect(ratio).toBeLessThan(2.0);
    });
  });
});
