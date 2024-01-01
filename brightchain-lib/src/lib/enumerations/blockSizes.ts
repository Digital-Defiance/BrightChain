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
  /// Message size, such as a small data blob, currently 512b.
  /// </summary>
  Message = 2 ** 9, // 512 (512b)

  /// <summary>
  /// Tiny size, such as smaller messages and configs, currently 1K.
  /// </summary>
  Tiny = 2 ** 10, // 1024 (1KiB)

  /// <summary>
  /// Small size, such as small data files up to a mb or so depending on desired block count, currently 4K.
  /// </summary>
  Small = 2 ** 12, // 4096 (4KiB)

  /// <summary>
  /// Medium size, such as medium data files up to 5-100mb, currently 1M.
  /// </summary>
  Medium = 2 ** 20, // 1048576 (1MiB)

  /// <summary>
  /// Large size, such as large data files over 4M up to many terabytes.
  /// </summary>
  Large = 2 ** 26, // 67108864 (64MiB)

  /// <summary>
  /// Huge size, such as huge data files over 64M up to many petabytes.
  /// </summary>
  Huge = 2 ** 28, // 268435456 (256MiB)
}

export const validBlockSizes = [
  BlockSize.Message,
  BlockSize.Tiny,
  BlockSize.Small,
  BlockSize.Medium,
  BlockSize.Large,
  BlockSize.Huge,
];

export const blockSizeLengths = [
  512,
  1024,
  4096,
  1048576,
  67108864,
  268435456,
];

export const validBlockSizeStrings = [
  'Message',
  'Tiny',
  'Small',
  'Medium',
  'Large',
  'Huge',
];

export const BlockSizeInfo: Map<BlockSize, { length: number, name: string }> = new Map<BlockSize, { length: number, name: string }>();
for (let i = 0; i < validBlockSizes.length; i++) {
  BlockSizeInfo.set(validBlockSizes[i], { length: blockSizeLengths[i], name: validBlockSizeStrings[i] });
}
export function blockSizeInfoBySize(blockSize: BlockSize): { length: number, name: string } {
  const result = BlockSizeInfo.get(blockSize);
  if (!result) {
    throw new Error(`Invalid block size ${blockSize}`);
  }
  return result;
}

export function lengthToBlockSizeIndex(length: number): number {
  const index = blockSizeLengths.indexOf(length);
  if (index < 0) {
    throw new Error(`Invalid block size length ${length}`);
  }
  return index;
}

export function lengthToBlockSize(length: number): BlockSize {
  const index = blockSizeLengths.indexOf(length);
  if (index < 0) {
    return BlockSize.Unknown;
  }
  return validBlockSizes[index];
}

export function validateBlockSize(length: number): boolean {
  return blockSizeLengths.indexOf(length) >= 0;
}

export function sizeToSizeString(blockSize: BlockSize): string {
  const index = validBlockSizes.indexOf(blockSize);
  if (index < 0) {
    throw new Error(`Invalid block size ${blockSize}`);
  }
  return validBlockSizeStrings[index];
}