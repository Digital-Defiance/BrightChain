/**
 * Example: Using the Checksum Class
 *
 * This example demonstrates how to use the unified Checksum class
 * for creating, comparing, and converting checksums.
 */

import { Checksum, ServiceProvider } from '../src/lib';

// Get the checksum service
const checksumService = ServiceProvider.getInstance().checksumService;

/**
 * Example 1: Creating Checksums from Different Sources
 */
function createChecksums() {
  console.log('=== Creating Checksums ===\n');

  // From Buffer
  const buffer = Buffer.from('Hello, BrightChain!');
  const checksumFromBuffer = Checksum.fromBuffer(buffer);
  console.log('From Buffer:', checksumFromBuffer.toHex());

  // From Uint8Array
  const array = new Uint8Array([1, 2, 3, 4, 5]);
  const checksumFromArray = Checksum.fromUint8Array(array);
  console.log('From Uint8Array:', checksumFromArray.toHex());

  // From hex string
  const hex = checksumFromBuffer.toHex();
  const checksumFromHex = Checksum.fromHex(hex);
  console.log('From Hex:', checksumFromHex.toHex());

  console.log();
}

/**
 * Example 2: Comparing Checksums
 */
function compareChecksums() {
  console.log('=== Comparing Checksums ===\n');

  const data1 = new Uint8Array([1, 2, 3]);
  const data2 = new Uint8Array([1, 2, 3]);
  const data3 = new Uint8Array([4, 5, 6]);

  const checksum1 = checksumService.calculateChecksumAsClass(data1);
  const checksum2 = checksumService.calculateChecksumAsClass(data2);
  const checksum3 = checksumService.calculateChecksumAsClass(data3);

  console.log('Checksum 1:', checksum1.toHex());
  console.log('Checksum 2:', checksum2.toHex());
  console.log('Checksum 3:', checksum3.toHex());
  console.log();

  console.log('checksum1.equals(checksum2):', checksum1.equals(checksum2)); // true
  console.log('checksum1.equals(checksum3):', checksum1.equals(checksum3)); // false

  console.log();
}

/**
 * Example 3: Converting Between Formats
 */
function convertFormats() {
  console.log('=== Converting Between Formats ===\n');

  const data = new TextEncoder().encode('BrightChain');
  const checksum = checksumService.calculateChecksumAsClass(data);

  // Convert to different formats
  const asBuffer = checksum.toBuffer();
  const asArray = checksum.toUint8Array();
  const asHex = checksum.toHex();
  const asString = checksum.toString(); // Same as toHex()

  console.log('As Buffer:', asBuffer);
  console.log('As Uint8Array:', asArray);
  console.log('As Hex:', asHex);
  console.log('As String:', asString);

  // Verify round-trip conversion
  const reconstructed = Checksum.fromBuffer(asBuffer);
  console.log('\nRound-trip successful:', checksum.equals(reconstructed));

  console.log();
}

/**
 * Example 4: Using with ChecksumService
 */
async function useWithService() {
  console.log('=== Using with ChecksumService ===\n');

  // Calculate checksum for string
  const stringChecksum =
    checksumService.calculateChecksumForStringAsClass('Hello, World!');
  console.log('String checksum:', stringChecksum.toHex());

  // Calculate checksum for multiple buffers
  const buffers = [
    new Uint8Array([1, 2, 3]),
    new Uint8Array([4, 5, 6]),
    new Uint8Array([7, 8, 9]),
  ];
  const combinedChecksum =
    checksumService.calculateChecksumForBuffersAsClass(buffers);
  console.log('Combined checksum:', combinedChecksum.toHex());

  // Calculate checksum for file (browser environment)
  if (typeof File !== 'undefined') {
    const file = new File(['File content'], 'test.txt');
    const fileChecksum =
      await checksumService.calculateChecksumForFileAsClass(file);
    console.log('File checksum:', fileChecksum.toHex());
  }

  console.log();
}

/**
 * Example 5: Error Handling
 */
function handleErrors() {
  console.log('=== Error Handling ===\n');

  try {
    // Invalid hex string
    const _invalidChecksum = Checksum.fromHex('not-a-hex-string');
  } catch (error) {
    console.log('Caught error for invalid hex:', error.message);
  }

  try {
    // Invalid length
    const shortArray = new Uint8Array(32); // Should be 64 bytes for SHA3-512
    const _invalidChecksum = Checksum.fromUint8Array(shortArray);
  } catch (error) {
    console.log('Caught error for invalid length:', error.message);
  }

  console.log();
}

/**
 * Example 6: Migration from Legacy API
 */
function migrationExample() {
  console.log('=== Migration from Legacy API ===\n');

  const data = new Uint8Array([1, 2, 3, 4, 5]);

  // Old way (deprecated but still works)
  const oldChecksum = checksumService.calculateChecksum(data);
  console.log('Old API (deprecated):', oldChecksum);

  // New way (recommended)
  const newChecksum = checksumService.calculateChecksumAsClass(data);
  console.log('New API (recommended):', newChecksum.toHex());

  // Both produce the same result
  const oldAsHex = Buffer.from(oldChecksum).toString('hex');
  const newAsHex = newChecksum.toHex();
  console.log('Results match:', oldAsHex === newAsHex);

  console.log();
}

// Run all examples
async function runExamples() {
  console.log('╔════════════════════════════════════════╗');
  console.log('║   BrightChain Checksum Class Examples  ║');
  console.log('╚════════════════════════════════════════╝\n');

  createChecksums();
  compareChecksums();
  convertFormats();
  await useWithService();
  handleErrors();
  migrationExample();

  console.log('✅ All examples completed successfully!');
}

// Run if executed directly
if (require.main === module) {
  runExamples().catch(console.error);
}

export {
  compareChecksums,
  convertFormats,
  createChecksums,
  handleErrors,
  migrationExample,
  useWithService,
};
