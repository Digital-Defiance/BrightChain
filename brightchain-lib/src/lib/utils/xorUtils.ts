import { XorService } from '../services/xor';

/**
 * XOR utility functions for CBL whitening operations.
 * These utilities wrap XorService and add padding/unpadding for block-aligned storage.
 */

/**
 * XOR two Uint8Arrays of equal length.
 * Delegates to XorService.xor for the actual XOR operation.
 *
 * @param a - First array
 * @param b - Second array
 * @returns XOR result (a ⊕ b)
 * @throws Error if arrays have different lengths
 */
export function xorArrays(a: Uint8Array, b: Uint8Array): Uint8Array {
  return XorService.xor(a, b);
}

/**
 * XOR multiple Uint8Arrays of equal length together.
 * Delegates to XorService.xorMultiple for the actual XOR operation.
 *
 * @param arrays - Array of Uint8Arrays to XOR together (must all be same length)
 * @returns XOR result
 * @throws Error if arrays have different lengths or if no arrays provided
 */
export function xorMultipleArrays(arrays: Uint8Array[]): Uint8Array {
  return XorService.xorMultiple(arrays);
}

/**
 * Length prefix size in bytes (4 bytes = 32-bit unsigned integer).
 * This allows for data up to ~4GB in size.
 */
const LENGTH_PREFIX_SIZE = 4;

/**
 * Pad data to a multiple of block size with length prefix and random bytes.
 * The padding ensures that the data aligns with block boundaries.
 *
 * Format: [4-byte length prefix][original data][random padding]
 *
 * @param data - The data to pad
 * @param blockSize - The target block size
 * @returns Padded data with length prefix
 */
export function padToBlockSize(
  data: Uint8Array,
  blockSize: number,
): Uint8Array {
  if (blockSize <= 0) {
    throw new Error(`Block size must be positive: ${blockSize}`);
  }

  // Total size needed: length prefix + data
  const totalDataSize = LENGTH_PREFIX_SIZE + data.length;

  // Calculate padded size (round up to next block boundary)
  const paddedSize = Math.ceil(totalDataSize / blockSize) * blockSize;

  // Create padded array
  const padded = new Uint8Array(paddedSize);

  // Write length prefix (big-endian 32-bit unsigned integer)
  const view = new DataView(padded.buffer);
  view.setUint32(0, data.length, false); // false = big-endian

  // Copy original data after length prefix
  padded.set(data, LENGTH_PREFIX_SIZE);

  // Fill remaining bytes with random data for security
  if (paddedSize > totalDataSize) {
    const paddingBytes = padded.subarray(totalDataSize);
    XorService.generateKey(paddingBytes.length).forEach((byte, i) => {
      paddingBytes[i] = byte;
    });
  }

  return padded;
}

/**
 * Remove padding from CBL data by reading the length prefix.
 * The length prefix tells us exactly how many bytes of original data follow.
 *
 * Format: [4-byte length prefix][original data][random padding]
 *
 * @param data - The padded CBL data with length prefix
 * @returns Unpadded CBL data (original data without length prefix or padding)
 * @throws Error if data is too short or length prefix is invalid
 */
export function unpadCblData(data: Uint8Array): Uint8Array {
  if (data.length < LENGTH_PREFIX_SIZE) {
    throw new Error(
      `Invalid padded data: too short (${data.length} bytes, need at least ${LENGTH_PREFIX_SIZE})`,
    );
  }

  // Read length prefix (big-endian 32-bit unsigned integer)
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const originalLength = view.getUint32(0, false); // false = big-endian

  // Validate length
  if (originalLength > data.length - LENGTH_PREFIX_SIZE) {
    throw new Error(
      `Invalid length prefix: claims ${originalLength} bytes but only ${data.length - LENGTH_PREFIX_SIZE} available`,
    );
  }

  // Return original data (after length prefix, up to original length)
  return data.subarray(LENGTH_PREFIX_SIZE, LENGTH_PREFIX_SIZE + originalLength);
}
