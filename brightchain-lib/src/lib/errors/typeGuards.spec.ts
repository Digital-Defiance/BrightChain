import { BrightChainStrings } from '../enumerations';
import { CblErrorType } from '../enumerations/cblErrorType';
import { EciesErrorType } from '../enumerations/eciesErrorType';
import { FecErrorType } from '../enumerations/fecErrorType';
import { ValidationErrorType } from '../enumerations/validationErrorType';
import { BrightChainError } from './brightChainError';
import { CblError } from './cblError';
import { ChecksumError, ChecksumErrorType } from './checksumError';
import { EciesError } from './eciesError';
import { EnhancedValidationError } from './enhancedValidationError';
import { FecError } from './fecError';
import {
  isAnyBrightChainError,
  isBrightChainError,
  isCblError,
  isChecksumError,
  isEciesError,
  isEnhancedValidationError,
  isFecError,
  isTypedError,
  isValidationError,
} from './typeGuards';
import { ValidationError } from './validationError';

/**
 * Tests for error type guards
 * @see Requirements 4.5, 14.4, 14.5, 14.6
 */
describe('Error Type Guards', () => {
  // Create concrete implementation of BrightChainError for testing
  class TestBrightChainError extends BrightChainError {
    constructor(message: string) {
      super('Test', message);
    }
  }

  describe('isBrightChainError', () => {
    it('should return true for BrightChainError instances', () => {
      const error = new TestBrightChainError('test error');
      expect(isBrightChainError(error)).toBe(true);
    });

    it('should return true for ChecksumError (subclass of BrightChainError)', () => {
      const error = new ChecksumError(
        ChecksumErrorType.InvalidLength,
        'Invalid length',
      );
      expect(isBrightChainError(error)).toBe(true);
    });

    it('should return true for EnhancedValidationError (subclass of BrightChainError)', () => {
      const error = new EnhancedValidationError(
        'field',
        BrightChainStrings.Error_Validation_Error,
      );
      expect(isBrightChainError(error)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('regular error');
      expect(isBrightChainError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isBrightChainError(null)).toBe(false);
      expect(isBrightChainError(undefined)).toBe(false);
      expect(isBrightChainError('string')).toBe(false);
      expect(isBrightChainError(123)).toBe(false);
      expect(isBrightChainError({})).toBe(false);
    });

    it('should enable TypeScript type narrowing', () => {
      const error: unknown = new TestBrightChainError('test');
      if (isBrightChainError(error)) {
        // TypeScript should recognize error.type exists
        expect(error.type).toBe('Test');
        expect(error.message).toBe('test');
      }
    });
  });

  describe('isChecksumError', () => {
    it('should return true for ChecksumError instances', () => {
      const error = new ChecksumError(
        ChecksumErrorType.InvalidLength,
        'Invalid length',
      );
      expect(isChecksumError(error)).toBe(true);
    });

    it('should return false for other BrightChainError subclasses', () => {
      const error = new EnhancedValidationError(
        'field',
        BrightChainStrings.Error_Validation_Error,
      );
      expect(isChecksumError(error)).toBe(false);
    });

    it('should return false for regular Error', () => {
      const error = new Error('regular error');
      expect(isChecksumError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isChecksumError(null)).toBe(false);
      expect(isChecksumError(undefined)).toBe(false);
      expect(isChecksumError('string')).toBe(false);
    });

    it('should enable TypeScript type narrowing', () => {
      const error: unknown = new ChecksumError(
        ChecksumErrorType.InvalidHex,
        'Invalid hex',
      );
      if (isChecksumError(error)) {
        // TypeScript should recognize checksumErrorType exists
        expect(error.checksumErrorType).toBe(ChecksumErrorType.InvalidHex);
      }
    });
  });

  describe('isEnhancedValidationError', () => {
    it('should return true for EnhancedValidationError instances', () => {
      const error = new EnhancedValidationError(
        'field',
        BrightChainStrings.Error_Validation_Error,
      );
      expect(isEnhancedValidationError(error)).toBe(true);
    });

    it('should return false for other BrightChainError subclasses', () => {
      const error = new ChecksumError(
        ChecksumErrorType.InvalidLength,
        'Invalid length',
      );
      expect(isEnhancedValidationError(error)).toBe(false);
    });

    it('should return false for original ValidationError', () => {
      const error = new ValidationError(
        ValidationErrorType.FileNameRequired,
        'File name required',
      );
      expect(isEnhancedValidationError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isEnhancedValidationError(null)).toBe(false);
      expect(isEnhancedValidationError(undefined)).toBe(false);
    });

    it('should enable TypeScript type narrowing', () => {
      const error: unknown = new EnhancedValidationError(
        'testField',
        BrightChainStrings.Error_Validation_Error,
      );
      if (isEnhancedValidationError(error)) {
        // TypeScript should recognize field exists
        expect(error.field).toBe('testField');
      }
    });
  });

  describe('isValidationError', () => {
    it('should return true for ValidationError instances', () => {
      const error = new ValidationError(
        ValidationErrorType.FileNameRequired,
        'File name required',
      );
      expect(isValidationError(error)).toBe(true);
    });

    it('should return false for EnhancedValidationError', () => {
      const error = new EnhancedValidationError(
        'field',
        BrightChainStrings.Error_Validation_Error,
      );
      expect(isValidationError(error)).toBe(false);
    });

    it('should return false for regular Error', () => {
      const error = new Error('regular error');
      expect(isValidationError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isValidationError(null)).toBe(false);
      expect(isValidationError(undefined)).toBe(false);
    });

    it('should enable TypeScript type narrowing', () => {
      const error: unknown = new ValidationError(
        ValidationErrorType.FileNameRequired,
        'Test',
      );
      if (isValidationError(error)) {
        // TypeScript should recognize type exists
        expect(error.type).toBe(ValidationErrorType.FileNameRequired);
      }
    });
  });

  describe('isEciesError', () => {
    it('should return true for EciesError instances', () => {
      const error = new EciesError(EciesErrorType.InvalidHeaderLength);
      expect(isEciesError(error)).toBe(true);
    });

    it('should return false for other TypedError subclasses', () => {
      const error = new CblError(CblErrorType.CblRequired);
      expect(isEciesError(error)).toBe(false);
    });

    it('should return false for BrightChainError', () => {
      const error = new TestBrightChainError('test');
      expect(isEciesError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isEciesError(null)).toBe(false);
      expect(isEciesError(undefined)).toBe(false);
    });

    it('should enable TypeScript type narrowing', () => {
      const error: unknown = new EciesError(EciesErrorType.InvalidSignature);
      if (isEciesError(error)) {
        // TypeScript should recognize type exists
        expect(error.type).toBe(EciesErrorType.InvalidSignature);
      }
    });
  });

  describe('isCblError', () => {
    it('should return true for CblError instances', () => {
      const error = new CblError(CblErrorType.CblRequired);
      expect(isCblError(error)).toBe(true);
    });

    it('should return false for other TypedError subclasses', () => {
      const error = new EciesError(EciesErrorType.InvalidHeaderLength);
      expect(isCblError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isCblError(null)).toBe(false);
      expect(isCblError(undefined)).toBe(false);
    });

    it('should enable TypeScript type narrowing', () => {
      const error: unknown = new CblError(CblErrorType.FileNameRequired);
      if (isCblError(error)) {
        // TypeScript should recognize type exists
        expect(error.type).toBe(CblErrorType.FileNameRequired);
      }
    });
  });

  describe('isFecError', () => {
    it('should return true for FecError instances', () => {
      const error = new FecError(FecErrorType.DataRequired);
      expect(isFecError(error)).toBe(true);
    });

    it('should return false for other TypedError subclasses', () => {
      const error = new CblError(CblErrorType.CblRequired);
      expect(isFecError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isFecError(null)).toBe(false);
      expect(isFecError(undefined)).toBe(false);
    });

    it('should enable TypeScript type narrowing', () => {
      const error: unknown = new FecError(FecErrorType.InvalidShardCounts);
      if (isFecError(error)) {
        // TypeScript should recognize type exists
        expect(error.type).toBe(FecErrorType.InvalidShardCounts);
      }
    });
  });

  describe('isTypedError', () => {
    it('should return true for TypedError subclass instances', () => {
      const eciesError = new EciesError(EciesErrorType.InvalidHeaderLength);
      const cblError = new CblError(CblErrorType.CblRequired);
      const fecError = new FecError(FecErrorType.DataRequired);

      expect(isTypedError(eciesError)).toBe(true);
      expect(isTypedError(cblError)).toBe(true);
      expect(isTypedError(fecError)).toBe(true);
    });

    it('should return false for BrightChainError', () => {
      const error = new TestBrightChainError('test');
      expect(isTypedError(error)).toBe(false);
    });

    it('should return false for regular Error', () => {
      const error = new Error('regular error');
      expect(isTypedError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isTypedError(null)).toBe(false);
      expect(isTypedError(undefined)).toBe(false);
    });

    it('should enable TypeScript type narrowing', () => {
      const error: unknown = new EciesError(EciesErrorType.InvalidSignature);
      if (isTypedError(error)) {
        // TypeScript should recognize type exists
        expect(error.type).toBeDefined();
      }
    });
  });

  describe('isAnyBrightChainError', () => {
    it('should return true for BrightChainError instances', () => {
      const error = new TestBrightChainError('test');
      expect(isAnyBrightChainError(error)).toBe(true);
    });

    it('should return true for ChecksumError', () => {
      const error = new ChecksumError(
        ChecksumErrorType.InvalidLength,
        'Invalid',
      );
      expect(isAnyBrightChainError(error)).toBe(true);
    });

    it('should return true for EnhancedValidationError', () => {
      const error = new EnhancedValidationError(
        'field',
        BrightChainStrings.Error_Validation_Error,
      );
      expect(isAnyBrightChainError(error)).toBe(true);
    });

    it('should return true for ValidationError', () => {
      const error = new ValidationError(
        ValidationErrorType.FileNameRequired,
        'Invalid',
      );
      expect(isAnyBrightChainError(error)).toBe(true);
    });

    it('should return true for TypedError subclasses', () => {
      const eciesError = new EciesError(EciesErrorType.InvalidHeaderLength);
      const cblError = new CblError(CblErrorType.CblRequired);
      const fecError = new FecError(FecErrorType.DataRequired);

      expect(isAnyBrightChainError(eciesError)).toBe(true);
      expect(isAnyBrightChainError(cblError)).toBe(true);
      expect(isAnyBrightChainError(fecError)).toBe(true);
    });

    it('should return false for regular Error', () => {
      const error = new Error('regular error');
      expect(isAnyBrightChainError(error)).toBe(false);
    });

    it('should return false for non-error values', () => {
      expect(isAnyBrightChainError(null)).toBe(false);
      expect(isAnyBrightChainError(undefined)).toBe(false);
      expect(isAnyBrightChainError('string')).toBe(false);
      expect(isAnyBrightChainError(123)).toBe(false);
      expect(isAnyBrightChainError({})).toBe(false);
    });
  });

  describe('Type guard usage in error handling', () => {
    it('should allow proper error handling with type narrowing', () => {
      const errors: unknown[] = [
        new ChecksumError(ChecksumErrorType.InvalidLength, 'Invalid length'),
        new EnhancedValidationError(
          'field',
          BrightChainStrings.Error_Validation_Error,
        ),
        new EciesError(EciesErrorType.InvalidSignature),
        new CblError(CblErrorType.FileNameRequired),
        new FecError(FecErrorType.DataRequired),
        new ValidationError(ValidationErrorType.FileNameRequired, 'Invalid'),
        new Error('regular error'),
        'not an error',
      ];

      const results: string[] = [];

      for (const error of errors) {
        if (isChecksumError(error)) {
          results.push(`checksum:${error.checksumErrorType}`);
        } else if (isEnhancedValidationError(error)) {
          results.push(`enhanced-validation:${error.field}`);
        } else if (isEciesError(error)) {
          results.push(`ecies:${error.type}`);
        } else if (isCblError(error)) {
          results.push(`cbl:${error.type}`);
        } else if (isFecError(error)) {
          results.push(`fec:${error.type}`);
        } else if (isValidationError(error)) {
          results.push(`validation:${error.type}`);
        } else if (error instanceof Error) {
          results.push(`error:${error.message}`);
        } else {
          results.push('unknown');
        }
      }

      expect(results).toEqual([
        `checksum:${ChecksumErrorType.InvalidLength}`,
        'enhanced-validation:field',
        `ecies:${EciesErrorType.InvalidSignature}`,
        `cbl:${CblErrorType.FileNameRequired}`,
        `fec:${FecErrorType.DataRequired}`,
        `validation:${ValidationErrorType.FileNameRequired}`,
        'error:regular error',
        'unknown',
      ]);
    });
  });
});
