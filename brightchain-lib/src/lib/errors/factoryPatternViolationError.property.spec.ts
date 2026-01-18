/**
 * @fileoverview Property-based tests for Factory Pattern Enforcement
 *
 * **Feature: design-improvements**
 *
 * This test suite verifies:
 * - Property 4: Factory Pattern Enforcement
 *
 * **Validates: Requirements 2.2**
 */

import fc from 'fast-check';
import { isBrightChainError } from './brightChainError';
import {
  FactoryPatternViolationError,
  isFactoryPatternViolationError,
} from './factoryPatternViolationError';

/**
 * Generate a valid class name (PascalCase identifier)
 */
const arbClassName = fc.stringMatching(/^[A-Z][A-Za-z0-9]{0,29}$/);

/**
 * Generate a valid context key (camelCase identifier)
 */
const arbContextKey = fc.stringMatching(/^[a-z][A-Za-z0-9]{0,19}$/);

/**
 * Generate a simple context value (string, number, or boolean)
 */
const arbSimpleValue = fc.oneof(
  fc.string({ minLength: 0, maxLength: 50 }),
  fc.integer({ min: -1000000, max: 1000000 }),
  fc.boolean(),
);

/**
 * Generate a valid context object
 */
const arbContext: fc.Arbitrary<Record<string, unknown>> = fc.dictionary(
  arbContextKey,
  arbSimpleValue,
  { minKeys: 0, maxKeys: 5 },
);

describe('Factory Pattern Enforcement Property Tests', () => {
  describe('Property 4: Factory Pattern Enforcement', () => {
    /**
     * **Feature: design-improvements, Property 4: Factory Pattern Enforcement**
     *
     * *For any* attempt to bypass factory methods, the system should throw FactoryPatternViolationError.
     *
     * **Validates: Requirements 2.2**
     */
    it('should create FactoryPatternViolationError with correct class name', () => {
      fc.assert(
        fc.property(arbClassName, (className) => {
          const error = new FactoryPatternViolationError(className);

          // Verify className is preserved
          expect(error.className).toBe(className);

          // Verify error message contains class name
          expect(error.message).toContain(className);
          expect(error.message).toContain('factory method');

          // Verify error type
          expect(error.type).toBe('FactoryPatternViolation');

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 2.2 - Error includes class name in context**
     */
    it('should include class name in error context', () => {
      fc.assert(
        fc.property(
          arbClassName,
          arbContext,
          (className, additionalContext) => {
            const error = new FactoryPatternViolationError(
              className,
              additionalContext,
            );

            // Verify className is in context
            expect(error.context?.['className']).toBe(className);

            // Verify additional context is preserved
            Object.keys(additionalContext).forEach((key) => {
              expect(error.context?.[key]).toEqual(additionalContext[key]);
            });

            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 2.2 - Type guard correctly identifies error**
     */
    it('should be correctly identified by type guard', () => {
      fc.assert(
        fc.property(arbClassName, (className) => {
          const error = new FactoryPatternViolationError(className);

          // Verify type guard returns true
          expect(isFactoryPatternViolationError(error)).toBe(true);

          // Verify it's also a BrightChainError
          expect(isBrightChainError(error)).toBe(true);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 2.2 - Type guard rejects non-errors**
     */
    it('should reject non-FactoryPatternViolationError values', () => {
      fc.assert(
        fc.property(
          fc.oneof(
            fc.string(),
            fc.integer(),
            fc.boolean(),
            fc.constant(null),
            fc.constant(undefined),
            fc.object(),
          ),
          (value) => {
            expect(isFactoryPatternViolationError(value)).toBe(false);
            return true;
          },
        ),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 2.2 - Error message format is consistent**
     */
    it('should produce consistent error message format', () => {
      fc.assert(
        fc.property(arbClassName, (className) => {
          const error = new FactoryPatternViolationError(className);

          // Verify message follows expected format
          const expectedMessage = `Cannot instantiate ${className} directly. Use the factory method instead.`;
          expect(error.message).toBe(expectedMessage);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 2.2 - Error is JSON serializable**
     */
    it('should produce JSON-serializable error', () => {
      fc.assert(
        fc.property(arbClassName, arbContext, (className, context) => {
          const error = new FactoryPatternViolationError(className, context);
          const json = error.toJSON();

          // Verify JSON.stringify doesn't throw
          const jsonString = JSON.stringify(json);
          expect(typeof jsonString).toBe('string');

          // Verify JSON.parse produces expected structure
          const parsed = JSON.parse(jsonString) as {
            name: string;
            type: string;
            message: string;
            context?: Record<string, unknown>;
          };

          expect(parsed.name).toBe('FactoryPatternViolationError');
          expect(parsed.type).toBe('FactoryPatternViolation');
          expect(parsed.message).toContain(className);
          expect(parsed.context?.['className']).toBe(className);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 2.2 - Error name is correct**
     */
    it('should have correct error name', () => {
      fc.assert(
        fc.property(arbClassName, (className) => {
          const error = new FactoryPatternViolationError(className);

          expect(error.name).toBe('FactoryPatternViolationError');

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 2.2 - Error has stack trace**
     */
    it('should have stack trace', () => {
      fc.assert(
        fc.property(arbClassName, (className) => {
          const error = new FactoryPatternViolationError(className);

          expect(error.stack).toBeDefined();
          expect(typeof error.stack).toBe('string');
          expect(error.stack!.length).toBeGreaterThan(0);

          return true;
        }),
        { numRuns: 100 },
      );
    });

    /**
     * **Validates: Requirement 2.2 - Type narrowing works after type guard**
     */
    it('should allow type-safe access after type guard', () => {
      fc.assert(
        fc.property(arbClassName, arbContext, (className, context) => {
          const error: unknown = new FactoryPatternViolationError(
            className,
            context,
          );

          if (isFactoryPatternViolationError(error)) {
            // TypeScript should recognize these properties
            expect(error.className).toBe(className);
            expect(error.type).toBe('FactoryPatternViolation');
            expect(error.context?.['className']).toBe(className);
            expect(typeof error.toJSON).toBe('function');
          } else {
            // This should never happen
            fail(
              'Type guard should return true for FactoryPatternViolationError',
            );
          }

          return true;
        }),
        { numRuns: 100 },
      );
    });
  });
});
