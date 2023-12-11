/**
 * @fileoverview Read Concern Block Store Interface
 *
 * Extends IBlockStore with read concern support for availability-aware reads.
 * Stores that support read concern (e.g., AvailabilityAwareBlockStore) implement
 * this interface so that consumers like Collection can propagate read concern
 * without type-unsafe casts.
 *
 * @see cross-node-eventual-consistency design, Section 6
 * @see Requirements 3.4
 */

import { RawDataBlock } from '../../blocks/rawData';
import { ReadConcern } from '../../enumerations/readConcern';
import { Checksum } from '../../types/checksum';
import { IBlockStore } from './blockStore';

/**
 * A block store that supports read concern levels on getData calls.
 * This extends the base IBlockStore with an optional readConcern parameter.
 *
 * Stores implementing this interface (e.g., AvailabilityAwareBlockStore)
 * can handle ReadConcern.Available and ReadConcern.Consistent by fetching
 * blocks from remote nodes when they are not available locally.
 */
export interface IReadConcernBlockStore extends IBlockStore {
  /**
   * Get a block's data with optional read concern.
   *
   * @param key - The block's checksum
   * @param readConcern - Optional read concern level
   * @returns Promise resolving to the block data
   * @throws PendingBlockError when readConcern is Available and block is pending fetch
   * @throws FetchTimeoutError when readConcern is Consistent and fetch times out
   */
  getData(key: Checksum, readConcern?: ReadConcern): Promise<RawDataBlock>;
}

/**
 * Type guard to check if a block store supports read concern.
 *
 * Uses structural typing: checks for the presence of `isInPartitionMode`,
 * which is characteristic of availability-aware block stores that support
 * read concern levels.
 *
 * @param store - The block store to check
 * @returns true if the store supports read concern on getData
 */
export function isReadConcernBlockStore(
  store: IBlockStore,
): store is IReadConcernBlockStore {
  return (
    'isInPartitionMode' in store &&
    typeof store.isInPartitionMode === 'function'
  );
}
