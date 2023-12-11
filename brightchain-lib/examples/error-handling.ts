/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Example: Error Handling with Type Guards
 *
 * This example demonstrates how to use BrightChain's unified error
 * handling system with type guards for type-safe error handling.
 */

import {
  BlockEncryptionType,
  BlockSize,
  BlockType,
  BrightChainError,
  Checksum,
  ChecksumError,
  FactoryPatternViolationError,
  isBrightChainError,
  isChecksumError,
  isValidationError,
  ServiceProvider,
  ValidationError,
} from '../src/lib';

/**
 * Example 1: Basic Error Handling with Type Guards
 */
function basicErrorHandling() {
  console.log('=== Basic Error Handling ===\n');

  try {
    // Attempt to create checksum from invalid hex
    const _checksum = Checksum.fromHex('invalid-hex-string');
  } catch (error) {
    if (isChecksumError(error)) {
      console.log('✓ Caught ChecksumError');
      console.log('  Type:', error.checksumErrorType);
      console.log('  Message:', error.message);
      console.log('  Context:', error.context);
    }
  }

  console.log();
}

/**
 * Example 2: Validation Error Handling
 */
function validationErrorHandling() {
  console.log('=== Validation Error Handling ===\n');

  const blockCapacityCalculator =
    ServiceProvider.getInstance().blockCapacityCalculator;

  try {
    // Invalid block size
    const _result = blockCapacityCalculator.calculateCapacity({
      blockSize: 999 as BlockSize, // Invalid
      blockType: BlockType.RawData,
      encryptionType: BlockEncryptionType.None,
    });
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Caught ValidationError');
      console.log('  Field:', error.field);
      console.log('  Message:', error.message);
      console.log('  Context:', error.context);
    }
  }

  console.log();
}

/**
 * Example 3: Factory Pattern Violation
 */
function factoryPatternViolation() {
  console.log('=== Factory Pattern Violation ===\n');

  try {
    // Attempt direct instantiation (this would throw if constructor was accessible)
    // Note: In actual code, the constructor is private and this won't compile
    console.log('Factory pattern enforced at runtime');
  } catch (error) {
    if (error instanceof FactoryPatternViolationError) {
      console.log('✓ Caught FactoryPatternViolationError');
      console.log('  Message:', error.message);
      console.log('  Context:', error.context);
    }
  }

  console.log();
}

/**
 * Example 4: Comprehensive Error Handling
 */
function comprehensiveErrorHandling() {
  console.log('=== Comprehensive Error Handling ===\n');

  function riskyOperation(): void {
    // Simulate various error conditions
    const errorType = Math.floor(Math.random() * 3);

    switch (errorType) {
      case 0:
        throw new ValidationError('testField', 'Test validation error', {
          value: 'invalid',
          expected: 'valid',
        });
      case 1:
        throw new ChecksumError('InvalidLength' as any, 'Test checksum error', {
          length: 32,
          expected: 64,
        });
      case 2:
        throw new Error('Generic error');
    }
  }

  try {
    riskyOperation();
  } catch (error) {
    // Handle specific error types
    if (isValidationError(error)) {
      console.log('✓ Validation Error:');
      console.log('  Field:', error.field);
      console.log('  Message:', error.message);
      console.log('  Context:', JSON.stringify(error.context, null, 2));
    } else if (isChecksumError(error)) {
      console.log('✓ Checksum Error:');
      console.log('  Type:', error.checksumErrorType);
      console.log('  Message:', error.message);
      console.log('  Context:', JSON.stringify(error.context, null, 2));
    } else if (isBrightChainError(error)) {
      console.log('✓ Generic BrightChain Error:');
      console.log('  Type:', error.type);
      console.log('  Message:', error.message);
      console.log('  Context:', JSON.stringify(error.context, null, 2));
    } else {
      console.log('✓ Non-BrightChain Error:');
      console.log(
        '  Message:',
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  console.log();
}

/**
 * Example 5: Error Context and Cause Chain
 */
function errorContextAndCause() {
  console.log('=== Error Context and Cause Chain ===\n');

  function innerFunction() {
    throw new Error('Original error');
  }

  function middleFunction() {
    try {
      innerFunction();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      throw new ValidationError('middleField', 'Middle layer error', {
        layer: 'middle',
      });
    }
  }

  function outerFunction() {
    try {
      middleFunction();
    } catch (error) {
      if (error instanceof Error) {
        throw new BrightChainError(
          'OuterError',
          'Outer layer error',
          { layer: 'outer' },
          error, // Preserve cause
        );
      }
      throw error;
    }
  }

  try {
    outerFunction();
  } catch (error) {
    if (isBrightChainError(error)) {
      console.log('✓ Error with cause chain:');
      console.log('  Type:', error.type);
      console.log('  Message:', error.message);
      console.log('  Context:', JSON.stringify(error.context, null, 2));

      if (error.cause) {
        console.log('  Caused by:', error.cause.message);
      }

      // Full error details
      console.log('\n  Full error JSON:');
      console.log(JSON.stringify(error.toJSON(), null, 2));
    }
  }

  console.log();
}

/**
 * Example 6: Async Error Handling
 */
async function asyncErrorHandling() {
  console.log('=== Async Error Handling ===\n');

  async function asyncOperation(): Promise<void> {
    // Simulate async operation that fails
    await new Promise((resolve) => setTimeout(resolve, 10));
    throw new ValidationError('asyncField', 'Async validation failed', {
      operation: 'async',
    });
  }

  try {
    await asyncOperation();
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Caught async ValidationError:');
      console.log('  Field:', error.field);
      console.log('  Message:', error.message);
      console.log('  Context:', JSON.stringify(error.context, null, 2));
    }
  }

  console.log();
}

/**
 * Example 7: Error Recovery Strategies
 */
function errorRecoveryStrategies() {
  console.log('=== Error Recovery Strategies ===\n');

  function attemptOperation(retries: number = 3): boolean {
    for (let i = 0; i < retries; i++) {
      try {
        // Simulate operation that might fail
        if (Math.random() > 0.7) {
          console.log(`  ✓ Operation succeeded on attempt ${i + 1}`);
          return true;
        }
        throw new ValidationError('operation', 'Operation failed', {
          attempt: i + 1,
        });
      } catch (error) {
        if (isValidationError(error)) {
          console.log(`  ✗ Attempt ${i + 1} failed: ${error.message}`);

          if (i === retries - 1) {
            console.log('  ✗ All retries exhausted');
            return false;
          }

          // Continue to next retry
          continue;
        }

        // Re-throw unexpected errors
        throw error;
      }
    }

    return false;
  }

  const success = attemptOperation(3);
  console.log(`\nFinal result: ${success ? 'Success' : 'Failed'}`);

  console.log();
}

/**
 * Example 8: Custom Error Handling Middleware
 */
function errorHandlingMiddleware() {
  console.log('=== Error Handling Middleware ===\n');

  type ErrorHandler = (error: unknown) => void;

  const errorHandlers: ErrorHandler[] = [
    // Log all errors
    (error) => {
      console.log(
        '  [Logger] Error occurred:',
        error instanceof Error ? error.message : String(error),
      );
    },

    // Handle validation errors
    (error) => {
      if (isValidationError(error)) {
        console.log(`  [Validator] Field "${error.field}" failed validation`);
      }
    },

    // Handle checksum errors
    (error) => {
      if (isChecksumError(error)) {
        console.log(`  [Checksum] Checksum error: ${error.checksumErrorType}`);
      }
    },

    // Report to monitoring service
    (error) => {
      if (isBrightChainError(error)) {
        console.log(
          `  [Monitor] Reported error type "${error.type}" to monitoring`,
        );
      }
    },
  ];

  function handleError(error: unknown): void {
    errorHandlers.forEach((handler) => handler(error));
  }

  // Simulate error
  try {
    throw new ValidationError('testField', 'Test error', { test: true });
  } catch (error) {
    console.log('Processing error through middleware:');
    handleError(error);
  }

  console.log();
}

// Run all examples
async function runExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   BrightChain Error Handling Examples  ║');
  console.log('╚════════════════════════════════════════╝\n');

  basicErrorHandling();
  validationErrorHandling();
  factoryPatternViolation();
  comprehensiveErrorHandling();
  errorContextAndCause();
  await asyncErrorHandling();
  errorRecoveryStrategies();
  errorHandlingMiddleware();

  console.log('✅ All examples completed successfully!');
}

// Run if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

export {
  asyncErrorHandling,
  basicErrorHandling,
  comprehensiveErrorHandling,
  errorContextAndCause,
  errorHandlingMiddleware,
  errorRecoveryStrategies,
  factoryPatternViolation,
  validationErrorHandling,
};
