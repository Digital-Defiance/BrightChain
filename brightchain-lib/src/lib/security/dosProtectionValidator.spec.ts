import { DEFAULT_DOS_LIMITS } from './dosProtection';
import { DosProtectionValidator } from './dosProtectionValidator';

describe('DosProtectionValidator', () => {
  let validator: DosProtectionValidator;

  beforeEach(() => {
    validator = DosProtectionValidator.getInstance();
  });

  describe('validateInputSize', () => {
    it('should allow input within size limit', () => {
      expect(() => {
        validator.validateInputSize('blockCreation', 1024);
      }).not.toThrow();
    });

    it('should reject input exceeding size limit', () => {
      const limits = DEFAULT_DOS_LIMITS['blockCreation'];
      expect(() => {
        validator.validateInputSize('blockCreation', limits.maxInputSize + 1);
      }).toThrow(/exceeds maximum/);
    });

    it('should use default limits for unknown operation', () => {
      expect(() => {
        validator.validateInputSize('unknownOp', 1024);
      }).not.toThrow();
    });
  });

  describe('withTimeout', () => {
    it('should resolve promise within timeout', async () => {
      const promise = Promise.resolve('success');
      const result = await validator.withTimeout('blockCreation', promise);
      expect(result).toBe('success');
    });

    it('should reject promise exceeding timeout', async () => {
      validator.setLimits('testOp', {
        maxInputSize: 1024,
        maxOperationTime: 100,
        maxMemoryUsage: 1024,
      });

      const slowPromise = new Promise((resolve) =>
        setTimeout(() => resolve('too slow'), 200),
      );

      await expect(
        validator.withTimeout('testOp', slowPromise),
      ).rejects.toThrow(/timeout/);
    });

    it('should handle promise rejection', async () => {
      const promise = Promise.reject(new Error('test error'));
      await expect(
        validator.withTimeout('blockCreation', promise),
      ).rejects.toThrow('test error');
    });
  });

  describe('setLimits', () => {
    it('should allow custom limits', () => {
      const customLimits = {
        maxInputSize: 2048,
        maxOperationTime: 1000,
        maxMemoryUsage: 4096,
      };

      validator.setLimits('customOp', customLimits);
      const limits = validator.getLimits('customOp');

      expect(limits).toEqual(customLimits);
    });
  });

  describe('getLimits', () => {
    it('should return limits for known operation', () => {
      const limits = validator.getLimits('blockCreation');
      expect(limits).toEqual(DEFAULT_DOS_LIMITS['blockCreation']);
    });

    it('should return default limits for unknown operation', () => {
      const limits = validator.getLimits('unknownOp');
      expect(limits).toEqual(DEFAULT_DOS_LIMITS['blockCreation']);
    });
  });
});
