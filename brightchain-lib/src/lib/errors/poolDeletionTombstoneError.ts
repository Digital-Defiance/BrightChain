import { PoolId } from '../interfaces/storage/pooledBlockStore';

/**
 * Error thrown when attempting to store a block in a pool
 * that has an active deletion tombstone.
 *
 * @see Requirements 2.5, 2.6
 */
export class PoolDeletionTombstoneError extends Error {
  constructor(public readonly poolId: PoolId) {
    super(
      `Cannot store block in pool "${poolId}": pool has been deleted (tombstone active)`,
    );
    this.name = 'PoolDeletionTombstoneError';
  }
}
