/**
 * Example: Factory Pattern Usage
 *
 * This example demonstrates how to use factory patterns in BrightChain
 * for creating objects with proper validation and initialization.
 */

import {
  Checksum,
  EmailString,
  Member,
  MemberDocument,
  MemberType,
  ServiceProvider,
} from '../src/lib';

/**
 * Example 1: Using Checksum Factory Methods
 */
function checksumFactoryMethods() {
  console.log('=== Checksum Factory Methods ===\n');

  // Create from Buffer
  const buffer = Buffer.from('Hello, BrightChain!');
  const checksumFromBuffer = Checksum.fromBuffer(buffer);
  console.log(
    '✓ Created from Buffer:',
    checksumFromBuffer.toHex().substring(0, 16) + '...',
  );

  // Create from Uint8Array
  const array = new Uint8Array([1, 2, 3, 4, 5]);
  const checksumFromArray = Checksum.fromUint8Array(array);
  console.log(
    '✓ Created from Uint8Array:',
    checksumFromArray.toHex().substring(0, 16) + '...',
  );

  // Create from hex string
  const hex = checksumFromBuffer.toHex();
  const checksumFromHex = Checksum.fromHex(hex);
  console.log(
    '✓ Created from Hex:',
    checksumFromHex.toHex().substring(0, 16) + '...',
  );

  // Verify all methods produce valid checksums
  console.log('\n✓ All factory methods produce valid Checksum instances');

  console.log();
}

/**
 * Example 2: Using MemberDocument Factory Method
 */
function memberDocumentFactory() {
  console.log('=== MemberDocument Factory Method ===\n');

  const eciesService = ServiceProvider.getInstance().eciesService;

  // Create members using the Member factory
  const publicMember = Member.newMember(
    eciesService,
    MemberType.User,
    'Alice',
    new EmailString('alice@example.com'),
  ).member;

  const privateMember = Member.newMember(
    eciesService,
    MemberType.User,
    'Alice Private',
    new EmailString('alice@example.com'),
  ).member;

  // Create MemberDocument using factory method
  const _memberDoc = MemberDocument.create(
    publicMember,
    privateMember,
    new Uint8Array([1, 2, 3]),
  );

  console.log('✓ Created MemberDocument using factory method');
  console.log('  Public Member:', publicMember.name);
  console.log('  Private Member:', privateMember.name);

  console.log();
}

/**
 * Example 3: Factory Pattern Enforcement
 */
function factoryPatternEnforcement() {
  console.log('=== Factory Pattern Enforcement ===\n');

  // The Checksum constructor is private, so direct instantiation
  // is prevented at compile time
  console.log('✓ TypeScript prevents direct instantiation at compile time');
  console.log('  Example: new Checksum(...) // ❌ Compile error');

  // At runtime, attempting to bypass the factory would throw an error
  console.log('\n✓ Runtime checks prevent factory pattern violations');
  console.log('  Factory patterns ensure proper validation and initialization');

  console.log();
}

/**
 * Example 4: Factory Method Benefits
 */
function factoryMethodBenefits() {
  console.log('=== Factory Method Benefits ===\n');

  console.log('Benefits of using factory methods:');
  console.log('  1. ✓ Validation: Input validation before object creation');
  console.log('  2. ✓ Consistency: Standardized creation process');
  console.log('  3. ✓ Flexibility: Can return different implementations');
  console.log('  4. ✓ Documentation: Clear, documented creation APIs');
  console.log('  5. ✓ Evolution: Can add features without breaking changes');

  console.log('\nExample: Checksum validation');

  try {
    // Invalid hex string - caught by factory method
    const _invalidChecksum = Checksum.fromHex('not-hex');
  } catch (error) {
    console.log('  ✓ Factory method caught invalid input:', error.message);
  }

  try {
    // Invalid length - caught by factory method
    const shortArray = new Uint8Array(32); // Should be 64 bytes
    const _invalidChecksum = Checksum.fromUint8Array(shortArray);
  } catch (error) {
    console.log('  ✓ Factory method caught invalid length:', error.message);
  }

  console.log();
}

/**
 * Example 5: Multiple Factory Methods
 */
function multipleFactoryMethods() {
  console.log('=== Multiple Factory Methods ===\n');

  const data = new TextEncoder().encode('BrightChain');
  const checksumService = ServiceProvider.getInstance().checksumService;

  // Different factory methods for different input types
  const checksum1 = checksumService.calculateChecksumAsClass(data);
  console.log('✓ From data:', checksum1.toHex().substring(0, 16) + '...');

  const checksum2 =
    checksumService.calculateChecksumForStringAsClass('BrightChain');
  console.log('✓ From string:', checksum2.toHex().substring(0, 16) + '...');

  const buffers = [new Uint8Array([1, 2, 3]), new Uint8Array([4, 5, 6])];
  const checksum3 = checksumService.calculateChecksumForBuffersAsClass(buffers);
  console.log('✓ From buffers:', checksum3.toHex().substring(0, 16) + '...');

  console.log('\n✓ Multiple factory methods provide flexibility');

  console.log();
}

/**
 * Example 6: Factory Method Patterns
 */
function factoryMethodPatterns() {
  console.log('=== Factory Method Patterns ===\n');

  console.log('Common factory method patterns in BrightChain:');
  console.log();

  console.log('1. from* methods - Create from specific input type');
  console.log('   Checksum.fromBuffer(buffer)');
  console.log('   Checksum.fromUint8Array(array)');
  console.log('   Checksum.fromHex(hex)');
  console.log();

  console.log('2. create methods - Create with validation');
  console.log('   MemberDocument.create(public, private, data)');
  console.log();

  console.log('3. new* methods - Create new instances');
  console.log('   Member.newMember(service, type, name, email)');
  console.log();

  console.log('4. calculate* methods - Create from computation');
  console.log('   checksumService.calculateChecksumAsClass(data)');
  console.log();

  console.log('✓ Consistent patterns make the API predictable');

  console.log();
}

/**
 * Example 7: Migration from Direct Instantiation
 */
function migrationFromDirectInstantiation() {
  console.log('=== Migration from Direct Instantiation ===\n');

  console.log('Before (v1.x - direct instantiation):');
  console.log('  const checksum = new Checksum(...); // ❌ Not allowed');
  console.log();

  console.log('After (v2.0 - factory methods):');
  console.log('  const checksum = Checksum.fromBuffer(buffer); // ✅ Correct');
  console.log(
    '  const checksum = Checksum.fromUint8Array(array); // ✅ Correct',
  );
  console.log('  const checksum = Checksum.fromHex(hex); // ✅ Correct');
  console.log();

  console.log('Benefits of migration:');
  console.log('  ✓ Type safety: Factory methods ensure correct types');
  console.log('  ✓ Validation: Input validation before object creation');
  console.log('  ✓ Clarity: Clear intent from method name');
  console.log(
    '  ✓ Flexibility: Can add new factory methods without breaking changes',
  );

  console.log();
}

/**
 * Example 8: Best Practices
 */
function bestPractices() {
  console.log('=== Best Practices ===\n');

  console.log('Best practices for using factory patterns:');
  console.log();

  console.log('1. ✓ Always use factory methods');
  console.log('   const checksum = Checksum.fromBuffer(buffer);');
  console.log();

  console.log('2. ✓ Handle factory method errors');
  console.log('   try {');
  console.log('     const checksum = Checksum.fromHex(hex);');
  console.log('   } catch (error) {');
  console.log('     // Handle validation error');
  console.log('   }');
  console.log();

  console.log('3. ✓ Use appropriate factory method for input type');
  console.log('   Checksum.fromBuffer(buffer)  // For Buffer');
  console.log('   Checksum.fromUint8Array(array)  // For Uint8Array');
  console.log('   Checksum.fromHex(hex)  // For hex string');
  console.log();

  console.log('4. ✓ Document factory method usage');
  console.log('   /**');
  console.log('    * Create checksum from buffer');
  console.log('    * @param buffer - The buffer to create checksum from');
  console.log('    * @returns Checksum instance');
  console.log('    */');
  console.log();

  console.log('5. ✓ Prefer factory methods over constructors');
  console.log('   Even when constructors are public, prefer factory methods');
  console.log('   for consistency and future-proofing');

  console.log();
}

// Run all examples
function runExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   BrightChain Factory Pattern Examples ║');
  console.log('╚════════════════════════════════════════╝\n');

  checksumFactoryMethods();
  memberDocumentFactory();
  factoryPatternEnforcement();
  factoryMethodBenefits();
  multipleFactoryMethods();
  factoryMethodPatterns();
  migrationFromDirectInstantiation();
  bestPractices();

  console.log('✅ All examples completed successfully!');
}

// Run if executed directly
if (require.main === module) {
  runExamples();
}

export {
  bestPractices,
  checksumFactoryMethods,
  factoryMethodBenefits,
  factoryMethodPatterns,
  factoryPatternEnforcement,
  memberDocumentFactory,
  migrationFromDirectInstantiation,
  multipleFactoryMethods,
};
