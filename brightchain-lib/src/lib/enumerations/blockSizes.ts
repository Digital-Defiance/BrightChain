import { GuidV4 } from "../guid";
import { GuidBrandType } from "./guidBrandType";

export const DataHeaderSize = 102;
export const CblHeaderSize = 110;

/**
 * Block size enumeration
 * Block sizes are powers of 2, starting at 256b
 * Raw data size. Unfilled blocks are filled with random data.
 */
export const enum BlockSize {
  /// <summary>
  /// Invalid/indeterminate/unknown block size.
  /// </summary>
  Unknown = 0,

  /// <summary>
  /// Best for extremely small messages. 256b.
  /// </summary>
  Micro = 2 ** 8, // 256

  /// <summary>
  /// Message size, such as a small data blob, currently 512b.
  /// </summary>
  Message = 2 ** 9, // 512

  /// <summary>
  /// Tiny size, such as smaller messages and configs, currently 1K.
  /// </summary>
  Tiny = 2 ** 10, // 1024

  /// <summary>
  /// Small size, such as small data files up to a mb or so depending on desired block count, currently 4K.
  /// </summary>
  Small = 2 ** 12, // 4096

  /// <summary>
  /// Medium size, such as medium data files up to 5-100mb, currently 1M.
  /// </summary>
  Medium = 2 ** 20, // 1048576

  /// <summary>
  /// Large size, such as large data files over 4M up to many terabytes.
  /// </summary>
  Large = 2 ** 26, // 67108864
}

export const validBlockSizes = [
  BlockSize.Micro,
  BlockSize.Message,
  BlockSize.Tiny,
  BlockSize.Small,
  BlockSize.Medium,
  BlockSize.Large,
];

export const blockSizeLengths = [
  256,
  512,
  1024,
  4096,
  1048576,
  67108864,
];

export const maxFileSizesWithData = [
  blockSizeLengths[0] - DataHeaderSize, // (2**8 - 102) = 154
  blockSizeLengths[1] - DataHeaderSize, // (2**9 - 102) = 410
  blockSizeLengths[2] - DataHeaderSize, // (2**10 - 102) = 922
  blockSizeLengths[3] - DataHeaderSize, // (2**12 - 102) = 3994
  blockSizeLengths[4] - DataHeaderSize, // (2**20 - 102) = 1048474
  blockSizeLengths[5] - DataHeaderSize, // (2**26 - 102) = 67108762
];

export const cblBlockDataLengths = [
  blockSizeLengths[0] - CblHeaderSize, // 2**8 - 110 = 146
  blockSizeLengths[1] - CblHeaderSize, // 2**9 - 110 = 402
  blockSizeLengths[2] - CblHeaderSize, // 2**10 - 110 = 914
  blockSizeLengths[3] - CblHeaderSize, // 2**12 - 110 = 3986
  blockSizeLengths[4] - CblHeaderSize, // 2**20 - 110 = 1048466
  blockSizeLengths[5] - CblHeaderSize, // 2**26 - 110 = 67108754
];

const guidLength = GuidV4.guidBrandToLength(GuidBrandType.RawGuidBuffer);
/**
 * Maximum number of IDs that can be stored in a CBL block for each block size
 */
export const cblBlockMaxIDCounts = [
  Math.floor(cblBlockDataLengths[0] / guidLength), // 146 / 16 = 9
  Math.floor(cblBlockDataLengths[1] / guidLength), // 402 / 16 = 25
  Math.floor(cblBlockDataLengths[2] / guidLength), // 914 / 16 = 57
  Math.floor(cblBlockDataLengths[3] / guidLength), // 3986 / 16 = 249
  Math.floor(cblBlockDataLengths[4] / guidLength), // 1048466 / 16 = 65529
  Math.floor(cblBlockDataLengths[5] / guidLength), // 67108754 / 16 = 4194297
];

/**
 * Maximum file sizes for each block size using a CBL and raw blocks
 */
export const maxFileSizesWithCBL = [
  0,
  blockSizeLengths[0] * cblBlockMaxIDCounts[0], // 9 * 2**8 = 2304
  blockSizeLengths[1] * cblBlockMaxIDCounts[1], // 25 * 2**9 = 12800
  blockSizeLengths[2] * cblBlockMaxIDCounts[2], // 57 * 2**10 = 58368
  blockSizeLengths[3] * cblBlockMaxIDCounts[3], // 249 * 2**12 = 1019904
  blockSizeLengths[4] * cblBlockMaxIDCounts[4], // 65529 * 2**20 = 68712136704
  blockSizeLengths[5] * cblBlockMaxIDCounts[5], // 4194297 * 2**26 = 281474506948608
];

export function lengthToBlockSize(length: number): BlockSize {
  const index = blockSizeLengths.indexOf(length);
  if (index < 0) {
    return BlockSize.Unknown;
  }
  return validBlockSizes[index];
}

export function blockSizeToLength(blockSize: BlockSize): number {
  const index = validBlockSizes.indexOf(blockSize);
  if (index < 0) {
    throw new Error(`Invalid block size ${blockSize}`);
  }
  return blockSizeLengths[index];
}

export function validateBlockSize(length: number): boolean {
  return blockSizeLengths.indexOf(length) >= 0;
}

/**
 * Finds the next largest block size for a given length
 * @param length
 */
export function nextLargestBlockSize(length: number): BlockSize {
  const index = blockSizeLengths.findIndex((size) => size >= length);
  if (index < 0) {
    return BlockSize.Unknown;
  }
  return validBlockSizes[index];
}
