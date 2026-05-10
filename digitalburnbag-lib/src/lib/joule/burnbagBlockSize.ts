/**
 * Block-size selection for Burnbag upload cost accounting.
 *
 * The receiving node may support a subset of the platform's block sizes
 * depending on its storage configuration (e.g. only Medium + Large on a
 * high-throughput node, all sizes on a dev node).  The Joule quote must
 * charge for the actual aligned footprint, so we pick the block size that
 * minimises wasted padding bytes for the given encrypted payload.
 *
 * Tie-breaking rule: when two sizes produce the same aligned total (e.g.
 * 512 B and 1 KiB for a 1000-byte payload both align to 1024 B) we prefer
 * the **larger** block size because fewer blocks mean lower I/O overhead.
 */

/**
 * Return the block size from `availableSizes` that wastes the fewest bytes
 * when aligning `encryptedBytes`.
 *
 * Formally, the function minimises
 *   `alignedBytes(B) = ceil(encryptedBytes / B) × B`
 * and, for equal `alignedBytes`, prefers the largest B.
 *
 * @param encryptedBytes  Exact byte count after AES-GCM encryption.
 * @param availableSizes  Non-empty list of block sizes (in bytes) supported
 *                        by the receiving node, in any order.
 * @returns               The chosen block size in bytes.
 * @throws                `Error('NO_AVAILABLE_BLOCK_SIZES')` when the list is empty.
 */
export function pickBlockSize(
  encryptedBytes: number,
  availableSizes: readonly number[],
): number {
  if (availableSizes.length === 0) {
    throw new Error('NO_AVAILABLE_BLOCK_SIZES');
  }

  let bestSize = availableSizes[0];
  let bestAligned = Math.ceil(encryptedBytes / bestSize) * bestSize;

  for (let i = 1; i < availableSizes.length; i++) {
    const size = availableSizes[i];
    const aligned = Math.ceil(encryptedBytes / size) * size;
    if (aligned < bestAligned || (aligned === bestAligned && size > bestSize)) {
      bestAligned = aligned;
      bestSize = size;
    }
  }

  return bestSize;
}

/**
 * Return the block-aligned byte count for `encryptedBytes` given a specific
 * block size.  This is a convenience wrapper used by the cost estimator after
 * `pickBlockSize` has resolved the block size.
 *
 * @param encryptedBytes  Exact byte count after AES-GCM encryption.
 * @param blockSize       The block size to align to (must be > 0).
 */
export function blockAlignedBytes(
  encryptedBytes: number,
  blockSize: number,
): number {
  if (blockSize <= 0) {
    throw new Error('INVALID_BLOCK_SIZE');
  }
  return Math.ceil(encryptedBytes / blockSize) * blockSize;
}
