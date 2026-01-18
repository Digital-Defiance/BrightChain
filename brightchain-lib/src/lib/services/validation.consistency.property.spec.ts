/**
 * Property-Based Tests for Validation Consistency
 *
 * **Property 5: Validation Consistency**
 * *For any* invalid input, all services should reject it with appropriate ValidationError
 *
 * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
 *
 * @module services/validation.consistency.property.spec
 */

import * as fc from 'fast-check';
import { BlockEncryptionType } from '../enumerations/blockEncryptionType';
import { BlockSize, validBlockSizes } from '../enumerations/blockSize';
import { BlockType } from '../enumerations/blockType';
import { EnhancedValidationError } from '../errors/enhancedValidationError';
import { Validator } from '../utils/validator';

describe('Validation Consistency Property Tests', () => {
  /**
   * Property 5: Validation Consistency
   *
   * For any invalid input, the Validator should:
   * 1. Throw EnhancedValidationError with appropriate field name
   * 2. Include context information in the error
   * 3. Provide a descriptive error message
   *
   * **Validates: Requirements 5.1, 5.2, 5.3, 5.4**
   */
  describe('Property 5: Validation Consistency', () => {
    describe('Block Size Validation', () => {
      it('should reject invalid block sizes with EnhancedValidationError', () => {
        // Generate invalid block sizes (numbers not in validBlockSizes)
        const invalidBlockSizeArb = fc
          .integer()
          .filter((n) => !validBlockSizes.includes(n as BlockSize));

        fc.assert(
          fc.property(invalidBlockSizeArb, (invalidBlockSize: number) => {
            try {
              Validator.validateBlockSize(
                invalidBlockSize as BlockSize,
                'testContext',
              );
              // Should not reach here
              return false;
            } catch (error) {
              // Must be EnhancedValidationError
              expect(error).toBeInstanceOf(EnhancedValidationError);
              const validationError = error as EnhancedValidationError;

              // Must have correct field name
              expect(validationError.field).toBe('blockSize');

              // Must have context
              expect(validationError.context).toBeDefined();
              expect(validationError.context?.['context']).toBe('testContext');

              // Must have descriptive message
              expect(validationError.message).toContain('Invalid block size');

              return true;
            }
          }),
          { numRuns: 50 },
        );
      });

      it('should accept all valid block sizes', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...validBlockSizes),
            (validBlockSize: BlockSize) => {
              // Should not throw
              expect(() =>
                Validator.validateBlockSize(validBlockSize, 'testContext'),
              ).not.toThrow();
              return true;
            },
          ),
          { numRuns: validBlockSizes.length },
        );
      });
    });

    describe('Block Type Validation', () => {
      const validBlockTypes = Object.values(BlockType).filter(
        (v): v is BlockType => typeof v === 'number' && v !== BlockType.Unknown,
      );

      it('should reject invalid block types with EnhancedValidationError', () => {
        // Generate invalid block types (numbers not in BlockType enum)
        const invalidBlockTypeArb = fc
          .integer({ min: 100, max: 999 })
          .filter((n) => !validBlockTypes.includes(n as BlockType));

        fc.assert(
          fc.property(invalidBlockTypeArb, (invalidBlockType: number) => {
            try {
              Validator.validateBlockType(
                invalidBlockType as BlockType,
                'testContext',
              );
              // Should not reach here
              return false;
            } catch (error) {
              // Must be EnhancedValidationError
              expect(error).toBeInstanceOf(EnhancedValidationError);
              const validationError = error as EnhancedValidationError;

              // Must have correct field name
              expect(validationError.field).toBe('blockType');

              // Must have context
              expect(validationError.context).toBeDefined();
              expect(validationError.context?.['context']).toBe('testContext');

              // Must have descriptive message
              expect(validationError.message).toContain('Invalid block type');

              return true;
            }
          }),
          { numRuns: 50 },
        );
      });

      it('should reject BlockType.Unknown', () => {
        expect(() =>
          Validator.validateBlockType(BlockType.Unknown, 'testContext'),
        ).toThrow(EnhancedValidationError);
      });

      it('should accept all valid block types', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...validBlockTypes),
            (validBlockType: BlockType) => {
              // Should not throw
              expect(() =>
                Validator.validateBlockType(validBlockType, 'testContext'),
              ).not.toThrow();
              return true;
            },
          ),
          { numRuns: validBlockTypes.length },
        );
      });
    });

    describe('Encryption Type Validation', () => {
      const validEncryptionTypes = Object.values(BlockEncryptionType).filter(
        (v): v is BlockEncryptionType => typeof v === 'number',
      );

      it('should reject invalid encryption types with EnhancedValidationError', () => {
        // Generate invalid encryption types
        const invalidEncryptionTypeArb = fc
          .integer({ min: 100, max: 999 })
          .filter(
            (n) => !validEncryptionTypes.includes(n as BlockEncryptionType),
          );

        fc.assert(
          fc.property(
            invalidEncryptionTypeArb,
            (invalidEncryptionType: number) => {
              try {
                Validator.validateEncryptionType(
                  invalidEncryptionType as BlockEncryptionType,
                  'testContext',
                );
                // Should not reach here
                return false;
              } catch (error) {
                // Must be EnhancedValidationError
                expect(error).toBeInstanceOf(EnhancedValidationError);
                const validationError = error as EnhancedValidationError;

                // Must have correct field name
                expect(validationError.field).toBe('encryptionType');

                // Must have context
                expect(validationError.context).toBeDefined();
                expect(validationError.context?.['context']).toBe(
                  'testContext',
                );

                // Must have descriptive message
                expect(validationError.message).toContain(
                  'Invalid encryption type',
                );

                return true;
              }
            },
          ),
          { numRuns: 50 },
        );
      });

      it('should accept all valid encryption types', () => {
        fc.assert(
          fc.property(
            fc.constantFrom(...validEncryptionTypes),
            (validEncryptionType: BlockEncryptionType) => {
              // Should not throw
              expect(() =>
                Validator.validateEncryptionType(
                  validEncryptionType,
                  'testContext',
                ),
              ).not.toThrow();
              return true;
            },
          ),
          { numRuns: validEncryptionTypes.length },
        );
      });
    });

    describe('Required Field Validation', () => {
      it('should reject null values with EnhancedValidationError', () => {
        fc.assert(
          fc.property(fc.string(), (fieldName: string) => {
            // Skip empty field names
            if (!fieldName || fieldName.trim().length === 0) return true;

            try {
              Validator.validateRequired(null, fieldName, 'testContext');
              // Should not reach here
              return false;
            } catch (error) {
              // Must be EnhancedValidationError
              expect(error).toBeInstanceOf(EnhancedValidationError);
              const validationError = error as EnhancedValidationError;

              // Must have correct field name
              expect(validationError.field).toBe(fieldName);

              // Must have descriptive message
              expect(validationError.message).toContain('is required');

              return true;
            }
          }),
          { numRuns: 20 },
        );
      });

      it('should reject undefined values with EnhancedValidationError', () => {
        fc.assert(
          fc.property(fc.string(), (fieldName: string) => {
            // Skip empty field names
            if (!fieldName || fieldName.trim().length === 0) return true;

            try {
              Validator.validateRequired(undefined, fieldName, 'testContext');
              // Should not reach here
              return false;
            } catch (error) {
              // Must be EnhancedValidationError
              expect(error).toBeInstanceOf(EnhancedValidationError);
              const validationError = error as EnhancedValidationError;

              // Must have correct field name
              expect(validationError.field).toBe(fieldName);

              // Must have descriptive message
              expect(validationError.message).toContain('is required');

              return true;
            }
          }),
          { numRuns: 20 },
        );
      });

      it('should accept non-null, non-undefined values', () => {
        fc.assert(
          fc.property(
            fc.oneof(
              fc.string(),
              fc.integer(),
              fc.boolean(),
              fc.array(fc.integer()),
              fc.object(),
            ),
            (value) => {
              // Should not throw for any non-null, non-undefined value
              expect(() =>
                Validator.validateRequired(value, 'testField', 'testContext'),
              ).not.toThrow();
              return true;
            },
          ),
          { numRuns: 50 },
        );
      });
    });

    describe('Not Empty Validation', () => {
      it('should reject empty strings with EnhancedValidationError', () => {
        try {
          Validator.validateNotEmpty('', 'testField', 'testContext');
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(EnhancedValidationError);
          const validationError = error as EnhancedValidationError;
          expect(validationError.field).toBe('testField');
          expect(validationError.message).toContain('cannot be empty');
        }
      });

      it('should reject whitespace-only strings with EnhancedValidationError', () => {
        // Generate whitespace-only strings
        const whitespaceStrings = ['   ', '\t', '\n', '\r', '  \t\n  '];

        for (const whitespaceString of whitespaceStrings) {
          try {
            Validator.validateNotEmpty(
              whitespaceString,
              'testField',
              'testContext',
            );
            // Should not reach here
            fail('Should have thrown for whitespace string');
          } catch (error) {
            // Must be EnhancedValidationError
            expect(error).toBeInstanceOf(EnhancedValidationError);
            const validationError = error as EnhancedValidationError;

            // Must have correct field name
            expect(validationError.field).toBe('testField');

            // Must have descriptive message
            expect(validationError.message).toContain('cannot be empty');
          }
        }
      });

      it('should accept non-empty strings', () => {
        // Generate non-empty strings with at least one non-whitespace character
        const nonEmptyArb = fc
          .string({ minLength: 1 })
          .filter((s) => s.trim().length > 0);

        fc.assert(
          fc.property(nonEmptyArb, (nonEmptyString: string) => {
            // Should not throw
            expect(() =>
              Validator.validateNotEmpty(
                nonEmptyString,
                'testField',
                'testContext',
              ),
            ).not.toThrow();
            return true;
          }),
          { numRuns: 50 },
        );
      });
    });

    describe('Recipient Count Validation', () => {
      it('should reject invalid recipient counts for multi-recipient encryption', () => {
        // Generate invalid recipient counts (0 or negative)
        const invalidCountArb = fc.integer({ max: 0 });

        fc.assert(
          fc.property(invalidCountArb, (invalidCount: number) => {
            try {
              Validator.validateRecipientCount(
                invalidCount,
                BlockEncryptionType.MultiRecipient,
                'testContext',
              );
              // Should not reach here
              return false;
            } catch (error) {
              // Must be EnhancedValidationError
              expect(error).toBeInstanceOf(EnhancedValidationError);
              const validationError = error as EnhancedValidationError;

              // Must have correct field name
              expect(validationError.field).toBe('recipientCount');

              return true;
            }
          }),
          { numRuns: 20 },
        );
      });

      it('should reject undefined recipient count for multi-recipient encryption', () => {
        expect(() =>
          Validator.validateRecipientCount(
            undefined,
            BlockEncryptionType.MultiRecipient,
            'testContext',
          ),
        ).toThrow(EnhancedValidationError);
      });

      it('should accept valid recipient counts for multi-recipient encryption', () => {
        // Generate valid recipient counts (1 to MAX_RECIPIENTS)
        const validCountArb = fc.integer({ min: 1, max: 255 }); // MAX_RECIPIENTS is typically 255

        fc.assert(
          fc.property(validCountArb, (validCount: number) => {
            // Should not throw
            expect(() =>
              Validator.validateRecipientCount(
                validCount,
                BlockEncryptionType.MultiRecipient,
                'testContext',
              ),
            ).not.toThrow();
            return true;
          }),
          { numRuns: 20 },
        );
      });

      it('should not validate recipient count for non-multi-recipient encryption', () => {
        // For non-multi-recipient encryption, any recipient count should be accepted
        const nonMultiEncryptionTypes = [
          BlockEncryptionType.None,
          BlockEncryptionType.SingleRecipient,
        ];

        fc.assert(
          fc.property(
            fc.constantFrom(...nonMultiEncryptionTypes),
            fc.option(fc.integer(), { nil: undefined }),
            (encryptionType, recipientCount) => {
              // Should not throw regardless of recipient count
              expect(() =>
                Validator.validateRecipientCount(
                  recipientCount,
                  encryptionType,
                  'testContext',
                ),
              ).not.toThrow();
              return true;
            },
          ),
          { numRuns: 20 },
        );
      });
    });

    describe('Cross-Service Validation Consistency', () => {
      it('should provide consistent error structure across all validation methods', () => {
        // Test that all validation errors have consistent structure
        const validationErrors: EnhancedValidationError[] = [];

        // Collect errors from different validation methods
        try {
          Validator.validateBlockSize(999 as BlockSize, 'ctx1');
        } catch (e) {
          if (e instanceof EnhancedValidationError) validationErrors.push(e);
        }

        try {
          Validator.validateBlockType(999 as BlockType, 'ctx2');
        } catch (e) {
          if (e instanceof EnhancedValidationError) validationErrors.push(e);
        }

        try {
          Validator.validateEncryptionType(999 as BlockEncryptionType, 'ctx3');
        } catch (e) {
          if (e instanceof EnhancedValidationError) validationErrors.push(e);
        }

        try {
          Validator.validateRequired(null, 'testField', 'ctx4');
        } catch (e) {
          if (e instanceof EnhancedValidationError) validationErrors.push(e);
        }

        try {
          Validator.validateNotEmpty('', 'testField', 'ctx5');
        } catch (e) {
          if (e instanceof EnhancedValidationError) validationErrors.push(e);
        }

        // All errors should have consistent structure
        expect(validationErrors.length).toBe(5);

        for (const error of validationErrors) {
          // All should be EnhancedValidationError
          expect(error).toBeInstanceOf(EnhancedValidationError);

          // All should have field property
          expect(error.field).toBeDefined();
          expect(typeof error.field).toBe('string');

          // All should have message
          expect(error.message).toBeDefined();
          expect(typeof error.message).toBe('string');
          expect(error.message.length).toBeGreaterThan(0);

          // All should have context
          expect(error.context).toBeDefined();
        }
      });
    });
  });
});
