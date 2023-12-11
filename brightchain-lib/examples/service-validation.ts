/**
 * Example: Service Validation
 *
 * This example demonstrates how BrightChain services validate inputs
 * and provide clear error messages for invalid data.
 */

import {
  BlockEncryptionType,
  BlockSize,
  BlockType,
  isValidationError,
  ServiceProvider,
  Validator,
} from '../src/lib';

/**
 * Example 1: Block Capacity Validation
 */
function blockCapacityValidation() {
  console.log('=== Block Capacity Validation ===\n');

  const calculator = ServiceProvider.getInstance().blockCapacityCalculator;

  // Valid parameters
  try {
    const result = calculator.calculateCapacity({
      blockSize: BlockSize.Small,
      blockType: BlockType.RawData,
      encryptionType: BlockEncryptionType.None,
    });
    console.log('✓ Valid parameters accepted');
    console.log('  Available capacity:', result.availableCapacity, 'bytes');
  } catch (error) {
    console.error('✗ Unexpected error:', error);
  }

  console.log();

  // Invalid block size
  try {
    const _result = calculator.calculateCapacity({
      blockSize: 999 as BlockSize,
      blockType: BlockType.RawData,
      encryptionType: BlockEncryptionType.None,
    });
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Invalid block size caught:');
      console.log('  Field:', error.field);
      console.log('  Message:', error.message);
    }
  }

  console.log();

  // Invalid block type
  try {
    const _result = calculator.calculateCapacity({
      blockSize: BlockSize.Small,
      blockType: 'InvalidType' as BlockType,
      encryptionType: BlockEncryptionType.None,
    });
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Invalid block type caught:');
      console.log('  Field:', error.field);
      console.log('  Message:', error.message);
    }
  }

  console.log();
}

/**
 * Example 2: Multi-Recipient Encryption Validation
 */
function multiRecipientValidation() {
  console.log('=== Multi-Recipient Encryption Validation ===\n');

  const calculator = ServiceProvider.getInstance().blockCapacityCalculator;

  // Missing recipient count
  try {
    const _result = calculator.calculateCapacity({
      blockSize: BlockSize.Small,
      blockType: BlockType.MultiEncryptedBlock,
      encryptionType: BlockEncryptionType.MultiRecipient,
      // recipientCount missing
    });
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Missing recipient count caught:');
      console.log('  Field:', error.field);
      console.log('  Message:', error.message);
    }
  }

  console.log();

  // Invalid recipient count (too low)
  try {
    const _result = calculator.calculateCapacity({
      blockSize: BlockSize.Small,
      blockType: BlockType.MultiEncryptedBlock,
      encryptionType: BlockEncryptionType.MultiRecipient,
      recipientCount: 0,
    });
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Invalid recipient count (too low) caught:');
      console.log('  Field:', error.field);
      console.log('  Message:', error.message);
    }
  }

  console.log();

  // Valid multi-recipient parameters
  try {
    const result = calculator.calculateCapacity({
      blockSize: BlockSize.Small,
      blockType: BlockType.MultiEncryptedBlock,
      encryptionType: BlockEncryptionType.MultiRecipient,
      recipientCount: 3,
    });
    console.log('✓ Valid multi-recipient parameters accepted');
    console.log('  Available capacity:', result.availableCapacity, 'bytes');
    console.log(
      '  Encryption overhead:',
      result.details.encryptionOverhead,
      'bytes',
    );
  } catch (error) {
    console.error('✗ Unexpected error:', error);
  }

  console.log();
}

/**
 * Example 3: Extended CBL Validation
 */
function extendedCblValidation() {
  console.log('=== Extended CBL Validation ===\n');

  const calculator = ServiceProvider.getInstance().blockCapacityCalculator;

  // Missing CBL data
  try {
    const _result = calculator.calculateCapacity({
      blockSize: BlockSize.Medium,
      blockType: BlockType.ExtendedConstituentBlockListBlock,
      encryptionType: BlockEncryptionType.None,
      // cbl data missing
    });
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Missing CBL data caught:');
      console.log('  Field:', error.field);
      console.log('  Message:', error.message);
    }
  }

  console.log();

  // Invalid file name (too long)
  try {
    const longFileName = 'a'.repeat(300); // Exceeds max length
    const _result = calculator.calculateCapacity({
      blockSize: BlockSize.Medium,
      blockType: BlockType.ExtendedConstituentBlockListBlock,
      encryptionType: BlockEncryptionType.None,
      cbl: {
        fileName: longFileName,
        mimeType: 'text/plain',
      },
    });
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Invalid file name (too long) caught:');
      console.log('  Field:', error.field);
      console.log('  Message:', error.message);
    }
  }

  console.log();

  // Invalid MIME type
  try {
    const _result = calculator.calculateCapacity({
      blockSize: BlockSize.Medium,
      blockType: BlockType.ExtendedConstituentBlockListBlock,
      encryptionType: BlockEncryptionType.None,
      cbl: {
        fileName: 'document.txt',
        mimeType: 'invalid-mime-type',
      },
    });
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Invalid MIME type caught:');
      console.log('  Field:', error.field);
      console.log('  Message:', error.message);
    }
  }

  console.log();

  // Valid extended CBL parameters
  try {
    const result = calculator.calculateCapacity({
      blockSize: BlockSize.Medium,
      blockType: BlockType.ExtendedConstituentBlockListBlock,
      encryptionType: BlockEncryptionType.None,
      cbl: {
        fileName: 'document.txt',
        mimeType: 'text/plain',
      },
    });
    console.log('✓ Valid extended CBL parameters accepted');
    console.log('  Available capacity:', result.availableCapacity, 'bytes');
    console.log(
      '  Variable overhead:',
      result.details.variableOverhead,
      'bytes',
    );
  } catch (error) {
    console.error('✗ Unexpected error:', error);
  }

  console.log();
}

/**
 * Example 4: Using Validator Utility
 */
function validatorUtility() {
  console.log('=== Validator Utility ===\n');

  // Validate block size
  try {
    Validator.validateBlockSize(BlockSize.Small, 'test');
    console.log('✓ Valid block size accepted');
  } catch (error) {
    console.error('✗ Unexpected error:', error);
  }

  try {
    Validator.validateBlockSize(999 as BlockSize, 'test');
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Invalid block size caught by Validator');
    }
  }

  console.log();

  // Validate block type
  try {
    Validator.validateBlockType(BlockType.RawData, 'test');
    console.log('✓ Valid block type accepted');
  } catch (error) {
    console.error('✗ Unexpected error:', error);
  }

  try {
    Validator.validateBlockType('InvalidType' as BlockType, 'test');
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Invalid block type caught by Validator');
    }
  }

  console.log();

  // Validate encryption type
  try {
    Validator.validateEncryptionType(
      BlockEncryptionType.SingleRecipient,
      'test',
    );
    console.log('✓ Valid encryption type accepted');
  } catch (error) {
    console.error('✗ Unexpected error:', error);
  }

  console.log();

  // Validate recipient count
  try {
    Validator.validateRecipientCount(
      3,
      BlockEncryptionType.MultiRecipient,
      'test',
    );
    console.log('✓ Valid recipient count accepted');
  } catch (error) {
    console.error('✗ Unexpected error:', error);
  }

  try {
    Validator.validateRecipientCount(
      undefined,
      BlockEncryptionType.MultiRecipient,
      'test',
    );
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Missing recipient count caught by Validator');
    }
  }

  console.log();

  // Validate required field
  try {
    Validator.validateRequired('value', 'testField', 'test');
    console.log('✓ Required field with value accepted');
  } catch (error) {
    console.error('✗ Unexpected error:', error);
  }

  try {
    Validator.validateRequired(undefined, 'testField', 'test');
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Missing required field caught by Validator');
    }
  }

  console.log();

  // Validate not empty
  try {
    Validator.validateNotEmpty('value', 'testField', 'test');
    console.log('✓ Non-empty string accepted');
  } catch (error) {
    console.error('✗ Unexpected error:', error);
  }

  try {
    Validator.validateNotEmpty('', 'testField', 'test');
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Empty string caught by Validator');
    }
  }

  console.log();
}

/**
 * Example 5: Validation Error Context
 */
function validationErrorContext() {
  console.log('=== Validation Error Context ===\n');

  const calculator = ServiceProvider.getInstance().blockCapacityCalculator;

  try {
    const _result = calculator.calculateCapacity({
      blockSize: 999 as BlockSize,
      blockType: BlockType.RawData,
      encryptionType: BlockEncryptionType.None,
    });
  } catch (error) {
    if (isValidationError(error)) {
      console.log('✓ Validation error with rich context:');
      console.log('  Field:', error.field);
      console.log('  Message:', error.message);
      console.log('  Context:', JSON.stringify(error.context, null, 2));
      console.log('  Type:', error.type);

      // Full error details
      console.log('\n  Full error JSON:');
      console.log(JSON.stringify(error.toJSON(), null, 2));
    }
  }

  console.log();
}

/**
 * Example 6: Best Practices for Validation
 */
function validationBestPractices() {
  console.log('=== Validation Best Practices ===\n');

  console.log('Best practices for handling validation:');
  console.log();

  console.log('1. ✓ Always validate inputs at service boundaries');
  console.log('   Services validate all parameters before processing');
  console.log();

  console.log('2. ✓ Use type guards for error handling');
  console.log('   if (isValidationError(error)) { ... }');
  console.log();

  console.log('3. ✓ Provide context in validation errors');
  console.log('   Errors include field name, expected values, and context');
  console.log();

  console.log('4. ✓ Fail fast with clear error messages');
  console.log('   Validation happens before any processing');
  console.log();

  console.log('5. ✓ Use Validator utility for common validations');
  console.log('   Validator.validateBlockSize(size, context)');
  console.log('   Validator.validateRequired(value, field, context)');
  console.log();

  console.log('6. ✓ Document validation requirements');
  console.log('   JSDoc comments specify required parameters and constraints');

  console.log();
}

// Run all examples
function runExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   BrightChain Service Validation       ║');
  console.log('╚════════════════════════════════════════╝\n');

  blockCapacityValidation();
  multiRecipientValidation();
  extendedCblValidation();
  validatorUtility();
  validationErrorContext();
  validationBestPractices();

  console.log('✅ All examples completed successfully!');
}

// Run if executed directly
if (require.main === module) {
  runExamples();
}

export {
  blockCapacityValidation,
  extendedCblValidation,
  multiRecipientValidation,
  validationBestPractices,
  validationErrorContext,
  validatorUtility,
};
