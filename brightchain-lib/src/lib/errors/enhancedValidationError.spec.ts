import { BrightChainStrings } from '../enumerations';
import { BrightChainError, isBrightChainError } from './brightChainError';
import {
  EnhancedValidationError,
  isEnhancedValidationError,
} from './enhancedValidationError';

describe('EnhancedValidationError', () => {
  describe('constructor', () => {
    it('should create an error with field and message', () => {
      const error = new EnhancedValidationError(
        'blockSize',
        BrightChainStrings.Error_BlockCapacity_InvalidBlockSize,
      );

      expect(error.field).toBe('blockSize');
      expect(error.message).toBeDefined();
      expect(error.type).toBe('Validation');
      expect(error.name).toBe('EnhancedValidationError');
    });

    it('should include field in context', () => {
      const error = new EnhancedValidationError(
        'recipientCount',
        BrightChainStrings.Error_Validator_RecipientCountMustBeAtLeastOne,
      );

      expect(error.context).toEqual({ field: 'recipientCount' });
    });

    it('should merge additional context with field', () => {
      const error = new EnhancedValidationError(
        'blockSize',
        BrightChainStrings.Error_Validator_InvalidBlockSizeTemplate,
        { validSizes: [256, 512, 1024], providedValue: 999 },
      );

      expect(error.context).toEqual({
        field: 'blockSize',
        validSizes: [256, 512, 1024],
        providedValue: 999,
      });
    });

    it('should extend BrightChainError', () => {
      const error = new EnhancedValidationError(
        'test',
        BrightChainStrings.Error_Validation_Error,
      );

      expect(error).toBeInstanceOf(BrightChainError);
      expect(error).toBeInstanceOf(Error);
    });

    it('should have proper stack trace', () => {
      const error = new EnhancedValidationError(
        'field',
        BrightChainStrings.Error_Validation_Error,
      );

      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('EnhancedValidationError');
    });
  });

  describe('toJSON', () => {
    it('should serialize error to JSON', () => {
      const error = new EnhancedValidationError(
        'encryptionType',
        BrightChainStrings.Error_Validator_InvalidEncryptionTypeTemplate,
        { providedType: 'Unknown' },
      );

      const json = error.toJSON();

      expect(json).toMatchObject({
        name: 'EnhancedValidationError',
        type: 'Validation',
        context: {
          field: 'encryptionType',
          providedType: 'Unknown',
        },
      });
      expect((json as { message: string }).message).toBeDefined();
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

    it('should return false for regular Error instances', () => {
      const error = new Error('message');

      expect(isEnhancedValidationError(error)).toBe(false);
    });

    it('should return false for null', () => {
      expect(isEnhancedValidationError(null)).toBe(false);
    });

    it('should return false for undefined', () => {
      expect(isEnhancedValidationError(undefined)).toBe(false);
    });

    it('should return false for non-error objects', () => {
      expect(isEnhancedValidationError({ field: 'test', message: 'msg' })).toBe(
        false,
      );
    });

    it('should return false for other BrightChainError subclasses', () => {
      // Create a different BrightChainError subclass for testing
      class OtherError extends BrightChainError {
        constructor() {
          super('Other', 'Other error');
        }
      }

      const error = new OtherError();
      expect(isEnhancedValidationError(error)).toBe(false);
    });
  });

  describe('isBrightChainError compatibility', () => {
    it('should be recognized by isBrightChainError type guard', () => {
      const error = new EnhancedValidationError(
        'field',
        BrightChainStrings.Error_Validation_Error,
      );

      expect(isBrightChainError(error)).toBe(true);
    });
  });

  describe('error throwing and catching', () => {
    it('should be catchable as EnhancedValidationError', () => {
      const throwError = () => {
        throw new EnhancedValidationError(
          'testField',
          BrightChainStrings.Error_Validation_Error,
        );
      };

      expect(throwError).toThrow(EnhancedValidationError);
    });

    it('should be catchable as BrightChainError', () => {
      const throwError = () => {
        throw new EnhancedValidationError(
          'testField',
          BrightChainStrings.Error_Validation_Error,
        );
      };

      try {
        throwError();
        fail('Should have thrown');
      } catch (error) {
        expect(isBrightChainError(error)).toBe(true);
      }
    });

    it('should be catchable as Error', () => {
      const throwError = () => {
        throw new EnhancedValidationError(
          'testField',
          BrightChainStrings.Error_Validation_Error,
        );
      };

      expect(throwError).toThrow(Error);
    });

    it('should preserve field information when caught', () => {
      try {
        throw new EnhancedValidationError(
          'blockType',
          BrightChainStrings.Error_Validator_InvalidBlockTypeTemplate,
          { blockType: 'Unknown' },
        );
      } catch (error) {
        if (isEnhancedValidationError(error)) {
          expect(error.field).toBe('blockType');
          expect(error.context?.['blockType']).toBe('Unknown');
        } else {
          fail('Error should be EnhancedValidationError');
        }
      }
    });
  });

  describe('real-world usage scenarios', () => {
    it('should work for block size validation', () => {
      const validateBlockSize = (size: number) => {
        const validSizes = [256, 512, 1024, 2048, 4096];
        if (!validSizes.includes(size)) {
          throw new EnhancedValidationError(
            'blockSize',
            BrightChainStrings.Error_Validator_InvalidBlockSizeTemplate,
            { providedSize: size, validSizes },
          );
        }
      };

      expect(() => validateBlockSize(999)).toThrow(EnhancedValidationError);

      try {
        validateBlockSize(999);
      } catch (error) {
        if (isEnhancedValidationError(error)) {
          expect(error.field).toBe('blockSize');
          expect(error.context?.['providedSize']).toBe(999);
        }
      }
    });

    it('should work for recipient count validation', () => {
      const validateRecipientCount = (count: number | undefined) => {
        if (count === undefined || count < 1) {
          throw new EnhancedValidationError(
            'recipientCount',
            BrightChainStrings.Error_Validator_RecipientCountMustBeAtLeastOne,
            { recipientCount: count, encryptionType: 'MultiRecipient' },
          );
        }
      };

      expect(() => validateRecipientCount(0)).toThrow(EnhancedValidationError);
      expect(() => validateRecipientCount(undefined)).toThrow(
        EnhancedValidationError,
      );
    });

    it('should work for required field validation', () => {
      const validateRequired = <T>(
        value: T | undefined | null,
        fieldName: string,
      ): T => {
        if (value === undefined || value === null) {
          throw new EnhancedValidationError(
            fieldName,
            BrightChainStrings.Error_Validator_FieldRequiredTemplate,
          );
        }
        return value;
      };

      expect(() => validateRequired(undefined, 'userId')).toThrow(
        EnhancedValidationError,
      );
      expect(() => validateRequired(null, 'data')).toThrow(
        EnhancedValidationError,
      );
      expect(validateRequired('value', 'field')).toBe('value');
    });
  });
});
