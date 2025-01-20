/**
 * Block sizes in the Owner Free Filesystem (OFF) are carefully chosen powers of 2
 * that balance several key factors:
 * 1. Storage efficiency
 * 2. Memory usage
 * 3. XOR operation performance
 * 4. Network transfer efficiency
 *
 * Block Size Selection:
 * - Smaller blocks (512B - 4KB): Better for small files, less padding waste
 * - Medium blocks (1MB): Good balance for typical files
 * - Large blocks (64MB - 256MB): Better for large files, more efficient storage
 */

/**
 * Block size exponents (2^x) for calculating block sizes.
 * These are chosen to provide a good range of sizes while maintaining
 * power-of-2 alignment for efficient operations.
 */
export const blockSizeExponents = [9, 10, 12, 20, 26, 28];

/**
 * Actual block sizes in bytes, calculated from the exponents.
 * Each size is optimized for different use cases and storage patterns.
 */
export const blockSizeLengths = [512, 1024, 4096, 1048576, 67108864, 268435456];

/**
 * Block size enumeration defining standard block sizes in OFF.
 * Each size is optimized for specific use cases and provides different
 * trade-offs between storage efficiency and performance.
 */
export const enum BlockSize {
  /**
   * Invalid or unknown block size.
   * Used for error conditions and initialization.
   */
  Unknown = 0,

  /**
   * Message size (512B)
   * Optimal for:
   * 1. Small messages
   * 2. Configuration data
   * 3. Metadata storage
   */
  Message = 512,

  /**
   * Tiny size (1KB)
   * Optimal for:
   * 1. Small files
   * 2. Configuration files
   * 3. Quick operations
   */
  Tiny = 1024,

  /**
   * Small size (4KB)
   * Optimal for:
   * 1. Small to medium files
   * 2. System page size alignment
   * 3. Efficient disk I/O
   */
  Small = 4096,

  /**
   * Medium size (1MB)
   * Optimal for:
   * 1. Medium-sized files
   * 2. Balanced performance
   * 3. Common file sizes
   */
  Medium = 1048576,

  /**
   * Large size (64MB)
   * Optimal for:
   * 1. Large files
   * 2. Streaming operations
   * 3. High throughput
   */
  Large = 67108864,

  /**
   * Huge size (256MB)
   * Optimal for:
   * 1. Very large files
   * 2. Maximum throughput
   * 3. Minimal overhead
   */
  Huge = 268435456,
}

/**
 * List of valid block sizes for validation and iteration.
 * Excludes Unknown size as it's not valid for actual use.
 */
export const validBlockSizes = [
  BlockSize.Message,
  BlockSize.Tiny,
  BlockSize.Small,
  BlockSize.Medium,
  BlockSize.Large,
  BlockSize.Huge,
];

/**
 * Human-readable names for block sizes.
 * Used for display and logging purposes.
 */
export const validBlockSizeStrings = [
  'Message',
  'Tiny',
  'Small',
  'Medium',
  'Large',
  'Huge',
];

/**
 * Map of block sizes to their metadata.
 * Provides quick access to size information and names.
 */
export const BlockSizeInfo: Map<BlockSize, { length: number; name: string }> =
  new Map<BlockSize, { length: number; name: string }>();
for (let i = 0; i < validBlockSizes.length; i++) {
  BlockSizeInfo.set(validBlockSizes[i], {
    length: blockSizeLengths[i],
    name: validBlockSizeStrings[i],
  });
}

/**
 * Get block size information by size value.
 * @param blockSize - The block size to look up
 * @returns Object containing the size's length and name
 * @throws Error if the block size is invalid
 */
export function blockSizeInfoBySize(blockSize: BlockSize): {
  length: number;
  name: string;
} {
  const result = BlockSizeInfo.get(blockSize);
  if (!result) {
    throw new Error(`Invalid block size ${blockSize}`);
  }
  return result;
}

/**
 * Convert a byte length to its block size index.
 * @param length - The length in bytes
 * @returns The index of the corresponding block size
 * @throws Error if the length doesn't match a valid block size
 */
export function lengthToBlockSizeIndex(length: number): number {
  const index = blockSizeLengths.indexOf(length);
  if (index < 0) {
    throw new Error(`Invalid block size length ${length}`);
  }
  return index;
}

/**
 * Convert a byte length to its BlockSize enum value.
 * @param length - The length in bytes
 * @returns The corresponding BlockSize enum value
 * @throws Error if the length doesn't match a valid block size
 */
export function lengthToBlockSize(length: number): BlockSize {
  const index = lengthToBlockSizeIndex(length);
  return validBlockSizes[index];
}

/**
 * Validate if a length matches a valid block size.
 * @param length - The length to validate
 * @returns True if the length is a valid block size
 */
export function validateBlockSize(length: number): boolean {
  return blockSizeLengths.indexOf(length) >= 0;
}

/**
 * Convert a BlockSize enum value to its string representation.
 * @param blockSize - The BlockSize enum value
 * @returns The human-readable name of the block size
 * @throws Error if the block size is invalid
 */
export function sizeToSizeString(blockSize: BlockSize): string {
  const index = validBlockSizes.indexOf(blockSize);
  if (index < 0) {
    throw new Error(`Invalid block size ${blockSize}`);
  }
  return validBlockSizeStrings[index];
}
