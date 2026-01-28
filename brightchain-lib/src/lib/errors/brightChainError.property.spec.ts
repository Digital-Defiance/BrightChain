/**
 * @fileoverview Property-based tests for Error Context Preservation
 *
 * **Feature: design-improvements**
 *
 * This test suite verifies:
 * - Property 6: Error Context Preservation
 *
 * **Validates: Requirements 4.3, 13.1, 13.2, 13.3**
 */

import fc from 'fast-check';
import { BrightChainStrings } from '../enumerations';
import { BrightChainError, isBrightChainError } from './brightChainError';
import { ChecksumError, ChecksumErrorType } from './checksumError';
import {
  EnhancedValidationError,
  isEnhancedValidationError,
} from './enhancedValidationError';

/**
 * Concrete implementation of BrightChainError for testing
 */
class TestServiceError extends BrightChainError {
  constructor(
    message: string,
    context?: Record<string, unknown>,
    cause?: Error,
  ) {
    super('TestService', message, context, cause);
  }
}

/**
 * Generate a valid error message (non-empty string)
 */
const arbErrorMessage = fc.stringMatching(/^[A-Za-z][A-Za-z0-9 ]{0,99}$/);

/**
 * Generate a valid service name
 */
const arbServiceName = fc.stringMatching(/^[A-Za-z][A-Za-z0-9]{0,29}$/);

/**
 * Generate a valid method name
 */
const arbMethodName = fc.stringMatching(/^[a-z][A-Za-z0-9]{0,29}$/);

/**
 * Generate a valid field name
 */
const arbFieldName = fc.stringMatching(/^[a-z][A-Za-z0-9]{0,19}$/);

/**
 * Generate a simple context value (string, number, or boolean)
 */
const arbSimpleValue = fc.oneof(
  fc.string({ minLength: 0, maxLength: 50 }),
  fc.integer({ min: -1000000, max: 1000000 }),
  fc.boolean(),
);

/**
 * Generate a valid context object with service name, method name, and parameters
 */
const arbContext: fc.Arbitrary<Record<string, unknown>> = fc.record({
  serviceName: arbServiceName,
  methodName: arbMethodName,
  timestamp: fc
    .date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') })
    .filter((d) => !isNaN(d.getTime()))
    .map((d) => d.toISOString()),
  parameters: fc.dictionary(arbFieldName, arbSimpleValue, {
    minKeys: 0,
    maxKeys: 5,
  }),
});

/**
 * Generate a ChecksumErrorType
 */
const arbChecksumErrorType = fc.constantFrom(
  ChecksumErrorType.InvalidLength,
  ChecksumErrorType.InvalidHex,
  ChecksumErrorType.ConversionFailed,
  ChecksumErrorType.ComparisonFailed,
);

describe('Error Context Preservation Property Tests', () => {
  describe('Property 6: Error Context Preservation', () => {
    /**
     * **Feature: design-improvements, Property 6: Error Context Preservation**
     *
     * *For any* wrapped error, the original error should be accessible via the cause property.
     *
     * **Validates: Requirements 4.3, 13.1, 13.2, 13.3**
     */
    it('should preserve original error as cause when wrapping errors', () => {
      fc.assert(
        fc.property(
          arbErrorMessage,
          arbErrorMessage,
          arbContext,
          (originalMessage, wrappedMessage, context) => {
            // Create original error
            const originalError = new Error(originalMessage);

            // Wrap it in a BrightChainError
            const wrappedError = new TestServiceError(
              wrappedMessage,
              context,
              originalError,
            );

            // Verify cause is preserved
            expect(wrappedError.cause).toBe(originalError);
            expect(wrappedError.cause?.message).toBe(originalMessage);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 13.1 - Service name in error**
     */
    it('should include service name in error context', () => {
      fc.assert(
        fc.property(
          arbErrorMessage,
          arbServiceName,
          arbMethodName,
          (message, serviceName, methodName) => {
            const context = { serviceName, methodName };
            const error = new TestServiceError(message, context);

            // Verify service name is in context
            expect(error.context?.['serviceName']).toBe(serviceName);

            // Verify it's accessible via toJSON
            const json = error.toJSON() as {
              context?: { serviceName?: string };
            };
            expect(json.context?.serviceName).toBe(serviceName);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 13.2 - Method name in error**
     */
    it('should include method name in error context', () => {
      fc.assert(
        fc.property(
          arbErrorMessage,
          arbServiceName,
          arbMethodName,
          (message, serviceName, methodName) => {
            const context = { serviceName, methodName };
            const error = new TestServiceError(message, context);

            // Verify method name is in context
            expect(error.context?.['methodName']).toBe(methodName);

            // Verify it's accessible via toJSON
            const json = error.toJSON() as {
              context?: { methodName?: string };
            };
            expect(json.context?.methodName).toBe(methodName);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 13.3 - Parameter values in error**
     */
    it('should include parameter values in error context', () => {
      fc.assert(
        fc.property(arbErrorMessage, arbContext, (message, context) => {
          const error = new TestServiceError(message, context);

          // Verify all context properties are preserved
          expect(error.context).toEqual(context);

          // Verify parameters are accessible
          if (context['parameters']) {
            expect(error.context?.['parameters']).toEqual(
              context['parameters'],
            );
          }

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 4.3 - Error wrapping preserves original**
     */
    it('should preserve cause through multiple levels of wrapping', () => {
      fc.assert(
        fc.property(
          arbErrorMessage,
          arbErrorMessage,
          arbErrorMessage,
          arbContext,
          arbContext,
          (msg1, msg2, msg3, ctx1, ctx2) => {
            // Create chain of errors
            const level1 = new Error(msg1);
            const level2 = new TestServiceError(msg2, ctx1, level1);
            const level3 = new TestServiceError(msg3, ctx2, level2);

            // Verify chain is preserved
            expect(level3.cause).toBe(level2);
            expect((level3.cause as TestServiceError).cause).toBe(level1);

            // Verify original message is accessible
            expect(
              ((level3.cause as TestServiceError).cause as Error).message,
            ).toBe(msg1);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 4.3, 13.1, 13.2, 13.3 - Context preserved in toJSON**
     */
    it('should preserve all context in toJSON serialization', () => {
      fc.assert(
        fc.property(
          arbErrorMessage,
          arbErrorMessage,
          arbContext,
          (originalMessage, wrappedMessage, context) => {
            const originalError = new Error(originalMessage);
            const wrappedError = new TestServiceError(
              wrappedMessage,
              context,
              originalError,
            );

            const json = wrappedError.toJSON() as {
              name: string;
              type: string;
              message: string;
              context?: Record<string, unknown>;
              cause?: string;
              stack?: string;
            };

            // Verify all fields are present
            expect(json.name).toBe('TestServiceError');
            expect(json.type).toBe('TestService');
            expect(json.message).toBe(wrappedMessage);
            expect(json.context).toEqual(context);
            expect(json.cause).toBe(originalMessage);
            expect(typeof json.stack).toBe('string');

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 4.3 - ChecksumError preserves context**
     */
    it('should preserve context in ChecksumError', () => {
      fc.assert(
        fc.property(
          arbChecksumErrorType,
          arbErrorMessage,
          fc.integer({ min: 0, max: 1000 }),
          fc.integer({ min: 0, max: 1000 }),
          (errorType, message, actualLength, expectedLength) => {
            const context = { actualLength, expectedLength };
            const error = new ChecksumError(errorType, message, context);

            // Verify checksumErrorType is preserved
            expect(error.checksumErrorType).toBe(errorType);

            // Verify context includes checksumErrorType and custom context
            expect(error.context?.['checksumErrorType']).toBe(errorType);
            expect(error.context?.['actualLength']).toBe(actualLength);
            expect(error.context?.['expectedLength']).toBe(expectedLength);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 4.3 - EnhancedValidationError preserves field and context**
     */
    it('should preserve field and context in EnhancedValidationError', () => {
      fc.assert(
        fc.property(
          arbFieldName,
          arbContext,
          (field, additionalContext) => {
            const error = new EnhancedValidationError(
              field,
              BrightChainStrings.Error_Validation_Error,
              additionalContext,
            );

            // Verify field is preserved
            expect(error.field).toBe(field);

            // Verify context includes field and additional context
            expect(error.context?.['field']).toBe(field);
            Object.keys(additionalContext).forEach((key) => {
              expect(error.context?.[key]).toEqual(additionalContext[key]);
            });

            // Verify type guard works
            expect(isEnhancedValidationError(error)).toBe(true);

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirements 4.3, 13.1, 13.2, 13.3 - Type guard preserves type information**
     */
    it('should allow type-safe access to context after type guard', () => {
      fc.assert(
        fc.property(arbErrorMessage, arbContext, (message, context) => {
          const error: unknown = new TestServiceError(message, context);

          if (isBrightChainError(error)) {
            // TypeScript should recognize these properties
            expect(error.type).toBe('TestService');
            expect(error.message).toBe(message);
            expect(error.context).toEqual(context);
            expect(typeof error.toJSON).toBe('function');
          } else {
            // This should never happen
            fail('Type guard should return true for BrightChainError');
          }

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 4.3 - JSON serialization is reversible for context**
     */
    it('should produce JSON-serializable context', () => {
      fc.assert(
        fc.property(arbErrorMessage, arbContext, (message, context) => {
          const error = new TestServiceError(message, context);
          const json = error.toJSON();

          // Verify JSON.stringify doesn't throw
          const jsonString = JSON.stringify(json);
          expect(typeof jsonString).toBe('string');

          // Verify JSON.parse produces equivalent context
          const parsed = JSON.parse(jsonString) as {
            context?: Record<string, unknown>;
          };
          expect(parsed.context).toEqual(context);

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });
});
