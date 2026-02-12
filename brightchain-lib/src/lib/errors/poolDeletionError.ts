import { PoolDeletionValidationResult } from '../interfaces/storage/pooledBlockStore';

/**
 * Thrown when `deletePool` finds cross-pool XOR dependencies that prevent safe deletion.
 * Contains the full validation result with details about dependent pools and referenced blocks.
 */
export class PoolDeletionError extends Error {
  constructor(
    message: string,
    public readonly validation: PoolDeletionValidationResult,
  ) {
    super(message);
    this.name = 'PoolDeletionError';
  }
}
