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

import { InvalidBlockSizeLengthError } from '../errors/invalidBlockSizeLength';
import { translate } from '../i18n';
import BrightChainStrings from './brightChainStrings';

/**
 * Block size exponents (2^x) for calculating block sizes.
 * These are chosen to provide a good range of sizes while maintaining
 * power-of-2 alignment for efficient operations.
 */
export const blockSizeExponents = [9, 10, 12, 20, 26, 28] as const;

/**
 * Actual block sizes in bytes, calculated from the exponents.
 * Each size is optimized for different use cases and storage patterns.
 */
export const blockSizeLengths = [
  2 ** blockSizeExponents[0],
  2 ** blockSizeExponents[1],
  2 ** blockSizeExponents[2],
  2 ** blockSizeExponents[3],
  2 ** blockSizeExponents[4],
  2 ** blockSizeExponents[5],
] as const;

/**
 * Block size enumeration defining standard block sizes in OFF.
 * Each size is optimized for specific use cases and provides different
 * trade-offs between storage efficiency and performance.
 */
export enum BlockSize {
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
  Message = blockSizeLengths[0],

  /**
   * Tiny size (1KB)
   * Optimal for:
   * 1. Small files
   * 2. Configuration files
   * 3. Quick operations
   */
  Tiny = blockSizeLengths[1],

  /**
   * Small size (4KB)
   * Optimal for:
   * 1. Small to medium files
   * 2. System page size alignment
   * 3. Efficient disk I/O
   */
  Small = blockSizeLengths[2],

  /**
   * Medium size (1MB)
   * Optimal for:
   * 1. Medium-sized files
   * 2. Balanced performance
   * 3. Common file sizes
   */
  Medium = blockSizeLengths[3],

  /**
   * Large size (64MB)
   * Optimal for:
   * 1. Large files
   * 2. Streaming operations
   * 3. High throughput
   */
  Large = blockSizeLengths[4],

  /**
   * Huge size (256MB)
   * Optimal for:
   * 1. Very large files
   * 2. Maximum throughput
   * 3. Minimal overhead
   */
  Huge = blockSizeLengths[5],
}

/**
 * List of valid block sizes for validation and iteration.
 * Excludes Unknown size as it's not valid for actual use.
 */
export const validBlockSizes: readonly BlockSize[] = [
  BlockSize.Message,
  BlockSize.Tiny,
  BlockSize.Small,
  BlockSize.Medium,
  BlockSize.Large,
  BlockSize.Huge,
] as const;

/**
 * Human-readable names for block sizes.
 * Used for display and logging purposes.
 */
export const blockSizeStringNames: Record<BlockSize, BrightChainStrings> = {
  [BlockSize.Unknown]: BrightChainStrings.BlockSize_Unknown,
  [BlockSize.Message]: BrightChainStrings.BlockSize_Message,
  [BlockSize.Tiny]: BrightChainStrings.BlockSize_Tiny,
  [BlockSize.Small]: BrightChainStrings.BlockSize_Small,
  [BlockSize.Medium]: BrightChainStrings.BlockSize_Medium,
  [BlockSize.Large]: BrightChainStrings.BlockSize_Large,
  [BlockSize.Huge]: BrightChainStrings.BlockSize_Huge,
} as const;

/**
 * Map of block sizes to their metadata.
 * Provides quick access to size information and names.
 */
export const BlockSizeInfo: {
  [key in BlockSize]: { blockSize: BlockSize; length: number; name: string };
} = {
  [BlockSize.Unknown]: {
    blockSize: BlockSize.Unknown,
    length: BlockSize.Unknown as number,
    name: BrightChainStrings.BlockSize_Unknown,
  },
  [BlockSize.Message]: {
    blockSize: BlockSize.Message,
    length: BlockSize.Message as number,
    name: BrightChainStrings.BlockSize_Message,
  },
  [BlockSize.Tiny]: {
    blockSize: BlockSize.Tiny,
    length: BlockSize.Tiny as number,
    name: BrightChainStrings.BlockSize_Tiny,
  },
  [BlockSize.Small]: {
    blockSize: BlockSize.Small,
    length: BlockSize.Small as number,
    name: BrightChainStrings.BlockSize_Small,
  },
  [BlockSize.Medium]: {
    blockSize: BlockSize.Medium,
    length: BlockSize.Medium as number,
    name: BrightChainStrings.BlockSize_Medium,
  },
  [BlockSize.Large]: {
    blockSize: BlockSize.Large,
    length: BlockSize.Large as number,
    name: BrightChainStrings.BlockSize_Large,
  },
  [BlockSize.Huge]: {
    blockSize: BlockSize.Huge,
    length: BlockSize.Huge as number,
    name: BrightChainStrings.BlockSize_Huge,
  },
} as const;

/**
 * Validate if a length matches a valid block size.
 * @param length - The length to validate
 * @param allowNonStandard - Whether to allow non-standard block sizes (for testing)
 * @returns True if the length is a valid block size
 */
export function validateBlockSize(
  length: number,
  allowNonStandard = false,
): boolean {
  // For standard validation, check if the length is in the predefined list
  if (blockSizeLengths.includes(length as number)) {
    return true;
  }

  // For testing purposes, allow non-standard block sizes
  if (allowNonStandard && length > 0) {
    return true;
  }

  return false;
}

/**
 * Convert a byte length to its BlockSize enum value.
 * @param length - The length in bytes
 * @param allowNonStandard - Whether to allow non-standard block sizes (for testing)
 * @returns The corresponding BlockSize enum value
 * @throws InvalidBlockSizeLengthError if the length doesn't match a valid block size
 */
export function lengthToBlockSize(
  length: number,
  allowNonStandard = true,
): BlockSize {
  // Check if the length is a valid block size
  if (!validateBlockSize(length, allowNonStandard)) {
    throw new InvalidBlockSizeLengthError(length);
  }

  // For standard block sizes, return the exact match
  const values = Object.values(BlockSizeInfo);
  for (let i = 0; i < values.length; i++) {
    if (values[i].length === length) {
      return values[i].blockSize;
    }
  }

  // For non-standard block sizes (in tests), return the closest block size
  if (allowNonStandard) {
    return lengthToClosestBlockSize(length);
  }

  // This should never happen since we've already validated the block size
  throw new InvalidBlockSizeLengthError(length);
}

/**
 * Convert a byte length to the closest BlockSize enum value.
 * @param length - The length in bytes
 * @returns The closest BlockSize enum value
 */
export function lengthToClosestBlockSize(length: number): BlockSize {
  if (length < 0) {
    throw new InvalidBlockSizeLengthError(length);
  }

  // For values larger than the largest block size, return the largest block size
  if (length > BlockSize.Huge) {
    return BlockSize.Huge;
  }

  const values = Object.values(BlockSizeInfo);
  // skip unknown, smallest valid block is 512
  for (let i = 1; i < values.length; i++) {
    if (length <= values[i].length) {
      return values[i].blockSize;
    }
  }

  // This should never happen since we've already handled values larger than BlockSize.Huge
  return BlockSize.Huge;
}

/**
 * Convert a BlockSize enum value to its string representation.
 * @param blockSize - The BlockSize enum value
 * @returns The human-readable name of the block size
 * @throws Error if the block size is invalid
 */
export function blockSizeToSizeString(blockSize: BlockSize): string {
  return translate(blockSizeStringNames[blockSize]);
}
