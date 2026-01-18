import { BrightChainError, isBrightChainError } from './brightChainError';
import {
  ChecksumError,
  ChecksumErrorType,
  isChecksumError,
} from './checksumError';

describe('ChecksumError', () => {
  describe('constructor', () => {
    it('should create an error with the correct type', () => {
      const error = new ChecksumError(
        ChecksumErrorType.InvalidLength,
        'Test message',
      );
      expect(error.type).toBe('Checksum');
      expect(error.checksumErrorType).toBe(ChecksumErrorType.InvalidLength);
    });

    it('should create an error with the correct message', () => {
      const message = 'Checksum must be 64 bytes';
      const error = new ChecksumError(ChecksumErrorType.InvalidLength, message);
      expect(error.message).toBe(message);
    });

    it('should include checksumErrorType in context', () => {
      const error = new ChecksumError(
        ChecksumErrorType.InvalidHex,
        'Invalid hex',
      );
      expect(error.context?.['checksumErrorType']).toBe(
        ChecksumErrorType.InvalidHex,
      );
    });

    it('should merge additional context with checksumErrorType', () => {
      const error = new ChecksumError(
        ChecksumErrorType.InvalidLength,
        'Invalid length',
        { actualLength: 32, expectedLength: 64 },
      );
      expect(error.context).toEqual({
        checksumErrorType: ChecksumErrorType.InvalidLength,
        actualLength: 32,
        expectedLength: 64,
      });
    });

    it('should set the error name to ChecksumError', () => {
      const error = new ChecksumError(
        ChecksumErrorType.ConversionFailed,
        'Conversion failed',
      );
      expect(error.name).toBe('ChecksumError');
    });

    it('should extend BrightChainError', () => {
      const error = new ChecksumError(
        ChecksumErrorType.ComparisonFailed,
        'Comparison failed',
      );
      expect(error).toBeInstanceOf(BrightChainError);
    });

    it('should extend Error', () => {
      const error = new ChecksumError(ChecksumErrorType.InvalidLength, 'Test');
      expect(error).toBeInstanceOf(Error);
    });

    it('should have a stack trace', () => {
      const error = new ChecksumError(ChecksumErrorType.InvalidLength, 'Test');
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ChecksumError');
    });
  });

  describe('toJSON', () => {
    it('should return a JSON-serializable object', () => {
      const error = new ChecksumError(
        ChecksumErrorType.InvalidLength,
        'Invalid length',
        { actualLength: 32 },
      );
      const json = error.toJSON();
      expect(json).toEqual({
        name: 'ChecksumError',
        type: 'Checksum',
        message: 'Invalid length',
        context: {
          checksumErrorType: ChecksumErrorType.InvalidLength,
          actualLength: 32,
        },
        cause: undefined,
        stack: expect.any(String),
      });
    });

    it('should be serializable with JSON.stringify', () => {
      const error = new ChecksumError(
        ChecksumErrorType.InvalidHex,
        'Invalid hex',
        { input: 'xyz' },
      );
      const jsonString = JSON.stringify(error.toJSON());
      const parsed = JSON.parse(jsonString);
      expect(parsed.name).toBe('ChecksumError');
      expect(parsed.type).toBe('Checksum');
      expect(parsed.message).toBe('Invalid hex');
    });
  });

  describe('error types', () => {
    it('should support InvalidLength error type', () => {
      const error = new ChecksumError(
        ChecksumErrorType.InvalidLength,
        'Checksum must be 64 bytes, got 32 bytes',
        { actualLength: 32, expectedLength: 64 },
      );
      expect(error.checksumErrorType).toBe(ChecksumErrorType.InvalidLength);
    });

    it('should support InvalidHex error type', () => {
      const error = new ChecksumError(
        ChecksumErrorType.InvalidHex,
        'Invalid hex string: contains non-hexadecimal characters',
        { input: 'xyz123' },
      );
      expect(error.checksumErrorType).toBe(ChecksumErrorType.InvalidHex);
    });

    it('should support ConversionFailed error type', () => {
      const error = new ChecksumError(
        ChecksumErrorType.ConversionFailed,
        'Failed to convert checksum format',
      );
      expect(error.checksumErrorType).toBe(ChecksumErrorType.ConversionFailed);
    });

    it('should support ComparisonFailed error type', () => {
      const error = new ChecksumError(
        ChecksumErrorType.ComparisonFailed,
        'Checksum comparison failed unexpectedly',
      );
      expect(error.checksumErrorType).toBe(ChecksumErrorType.ComparisonFailed);
    });
  });
});

describe('isChecksumError', () => {
  it('should return true for ChecksumError instances', () => {
    const error = new ChecksumError(ChecksumErrorType.InvalidLength, 'Test');
    expect(isChecksumError(error)).toBe(true);
  });

  it('should return false for generic Error', () => {
    const error = new Error('Test');
    expect(isChecksumError(error)).toBe(false);
  });

  it('should return false for null', () => {
    expect(isChecksumError(null)).toBe(false);
  });

  it('should return false for undefined', () => {
    expect(isChecksumError(undefined)).toBe(false);
  });

  it('should return false for plain object', () => {
    expect(isChecksumError({ type: 'Checksum', message: 'Test' })).toBe(false);
  });

  it('should return false for string', () => {
    expect(isChecksumError('ChecksumError')).toBe(false);
  });

  it('should work with isBrightChainError', () => {
    const error = new ChecksumError(ChecksumErrorType.InvalidLength, 'Test');
    // ChecksumError should also be a BrightChainError
    expect(isBrightChainError(error)).toBe(true);
    expect(isChecksumError(error)).toBe(true);
  });
});

describe('ChecksumErrorType enum', () => {
  it('should have InvalidLength value', () => {
    expect(ChecksumErrorType.InvalidLength).toBe('InvalidLength');
  });

  it('should have InvalidHex value', () => {
    expect(ChecksumErrorType.InvalidHex).toBe('InvalidHex');
  });

  it('should have ConversionFailed value', () => {
    expect(ChecksumErrorType.ConversionFailed).toBe('ConversionFailed');
  });

  it('should have ComparisonFailed value', () => {
    expect(ChecksumErrorType.ComparisonFailed).toBe('ComparisonFailed');
  });

  it('should have exactly 4 values', () => {
    const values = Object.values(ChecksumErrorType);
    expect(values.length).toBe(4);
  });
});
