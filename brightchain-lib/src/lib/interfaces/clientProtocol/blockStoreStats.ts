/**
 * Block store statistics for storage monitoring.
 *
 * @see Requirements 5.1, 10.1
 */
export interface IBlockStoreStats {
  totalCapacity: number; // bytes
  currentUsage: number; // bytes
  availableSpace: number; // bytes
  blockCounts: Record<string, number>; // blockType -> count
  totalBlocks: number;
}
