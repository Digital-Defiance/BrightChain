/**
 * Pool-based storage isolation types and utilities.
 *
 * Pools are lightweight namespace prefixes on block IDs that provide
 * logical grouping without requiring separate physical storage.
 * Internal storage keys use the format "${poolId}:${hash}".
 */

import { BlockSize } from '../../enumerations/blockSize';
import { Checksum } from '../../types/checksum';
import { BlockStoreOptions } from './blockMetadata';
import { IBlockStore } from './blockStore';
import type { CBLStorageResult, CBLWhiteningOptions } from './cblWhitening';

/**
 * Pool identifier type. Must match /^[a-zA-Z0-9_-]{1,64}$/.
 * Case-sensitive. "default" is reserved for unpooled blocks.
 */
export type PoolId = string;

/** Reserved pool identifier for unpooled/legacy blocks */
export const DEFAULT_POOL: PoolId = 'default';

/** Regex for valid pool identifiers: 1-64 alphanumeric, underscore, or hyphen characters */
const POOL_ID_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

/**
 * Validate a pool identifier.
 * @param poolId - The pool identifier to validate
 * @throws Error if the pool ID is invalid (empty, too long, or contains invalid characters)
 */
export function validatePoolId(poolId: PoolId): void {
  if (!POOL_ID_PATTERN.test(poolId)) {
    throw new Error(
      `Invalid pool ID "${poolId}": must match /^[a-zA-Z0-9_-]{1,64}$/`,
    );
  }
}

/**
 * Check if a pool ID is valid without throwing.
 * @param poolId - The pool identifier to check
 * @returns true if the pool ID matches the required pattern
 */
export function isValidPoolId(poolId: PoolId): boolean {
  return POOL_ID_PATTERN.test(poolId);
}

/**
 * Construct an internal storage key from pool and hash.
 * Format: "${poolId}:${hash}"
 * @param poolId - The pool identifier
 * @param hash - The block hash
 * @returns The composite storage key
 */
export function makeStorageKey(poolId: PoolId, hash: string): string {
  return `${poolId}:${hash}`;
}

/**
 * Parse a storage key into its pool and hash components.
 * The pool is everything up to the first colon; the hash is the rest.
 * Keys without a colon are treated as belonging to the default pool.
 * @param key - The composite storage key
 * @returns An object with the poolId and hash
 */
export function parseStorageKey(key: string): { poolId: PoolId; hash: string } {
  const colonIndex = key.indexOf(':');
  if (colonIndex === -1) {
    return { poolId: DEFAULT_POOL, hash: key };
  }
  return {
    poolId: key.substring(0, colonIndex),
    hash: key.substring(colonIndex + 1),
  };
}

/** Pagination options for listing blocks in a pool */
export interface ListOptions {
  /** Maximum number of items to return */
  limit?: number;
  /** Opaque cursor for pagination (the last hash from the previous page) */
  cursor?: string;
}

/** Statistics about a pool */
export interface PoolStats {
  /** The pool identifier */
  poolId: PoolId;
  /** Number of blocks in the pool */
  blockCount: number;
  /** Total bytes stored in the pool */
  totalBytes: number;
  /** When the pool was first created (first block stored) */
  createdAt: Date;
  /** When the pool was last accessed (any read or write) */
  lastAccessedAt: Date;
}

/** Result of a pool deletion validation check */
export interface PoolDeletionValidationResult {
  /** Whether the pool can be safely deleted */
  safe: boolean;
  /** Pools that depend on blocks in the target pool (empty if safe) */
  dependentPools: PoolId[];
  /** Block checksums in the target pool that are referenced by other pools' CBLs */
  referencedBlocks: string[];
}

/**
 * Extended block store interface with pool-scoped operations.
 * Pools provide namespace isolation for blocks without separate physical storage.
 *
 * Implementations should delegate legacy IBlockStore methods to the DEFAULT_POOL.
 */
export interface IPooledBlockStore extends IBlockStore {
  // === Pool-Scoped Block Operations ===

  /** Check if a block exists in a specific pool */
  hasInPool(pool: PoolId, hash: string): Promise<boolean>;

  /** Get block data from a specific pool */
  getFromPool(pool: PoolId, hash: string): Promise<Uint8Array>;

  /** Store block data in a specific pool, returns the block hash */
  putInPool(
    pool: PoolId,
    data: Uint8Array,
    options?: BlockStoreOptions,
  ): Promise<string>;

  /** Delete a block from a specific pool */
  deleteFromPool(pool: PoolId, hash: string): Promise<void>;

  // === Pool Management ===

  /** List all pools that contain at least one block */
  listPools(): Promise<PoolId[]>;

  /** List block hashes in a pool with optional pagination */
  listBlocksInPool(pool: PoolId, options?: ListOptions): AsyncIterable<string>;

  /** Get statistics for a pool */
  getPoolStats(pool: PoolId): Promise<PoolStats>;

  /** Delete an entire pool and all its blocks */
  deletePool(pool: PoolId): Promise<void>;

  // === Pool-Scoped Whitening Operations ===

  /**
   * Get random block checksums scoped to a specific pool.
   * Used for pool-scoped whitening to ensure tuples don't cross pool boundaries.
   * @param pool - The pool to source random blocks from
   * @param count - Number of random blocks requested
   * @returns Array of checksums (may be fewer than count if pool has insufficient blocks)
   */
  getRandomBlocksFromPool(pool: PoolId, count: number): Promise<Checksum[]>;

  /**
   * Seed a pool with cryptographically random blocks for whitening material.
   * @param pool - The pool to bootstrap
   * @param blockSize - The block size for generated random blocks
   * @param count - Number of random blocks to generate
   */
  bootstrapPool(
    pool: PoolId,
    blockSize: BlockSize,
    count: number,
  ): Promise<void>;

  /**
   * Check whether a pool can be safely deleted (no cross-pool XOR dependencies).
   * @param pool - The pool to validate for deletion
   * @returns Validation result with dependency details if unsafe
   */
  validatePoolDeletion(pool: PoolId): Promise<PoolDeletionValidationResult>;

  /**
   * Delete a pool without checking for cross-pool dependencies.
   * For administrative use only.
   * @param pool - The pool to force-delete
   */
  forceDeletePool(pool: PoolId): Promise<void>;

  // === Pool-Scoped CBL Whitening Operations ===

  /**
   * Store a CBL with XOR whitening, scoped to a specific pool.
   * Both XOR component blocks are stored within the specified pool namespace,
   * ensuring pool isolation for whitened CBL storage.
   *
   * @param pool - The pool to store the whitened CBL components in
   * @param cblData - The original CBL data as Uint8Array
   * @param options - Optional storage options (durability, expiration, encryption flag)
   * @returns Result containing block IDs, parity IDs (if any), and magnet URL
   * @throws StoreError if storage fails
   */
  storeCBLWithWhiteningInPool(
    pool: PoolId,
    cblData: Uint8Array,
    options?: CBLWhiteningOptions,
  ): Promise<CBLStorageResult>;

  /**
   * Retrieve and reconstruct a whitened CBL from a specific pool.
   * Both XOR component blocks are retrieved from the specified pool namespace.
   *
   * @param pool - The pool to retrieve the whitened CBL components from
   * @param blockId1 - First block ID (Checksum or hex string)
   * @param blockId2 - Second block ID (Checksum or hex string)
   * @param block1ParityIds - Optional parity block IDs for block 1 recovery
   * @param block2ParityIds - Optional parity block IDs for block 2 recovery
   * @returns The original CBL data as Uint8Array
   * @throws StoreError if either block is not found in the pool or reconstruction fails
   */
  retrieveCBLFromPool(
    pool: PoolId,
    blockId1: Checksum | string,
    blockId2: Checksum | string,
    block1ParityIds?: string[],
    block2ParityIds?: string[],
  ): Promise<Uint8Array>;
}

/**
 * Type guard to check if a block store implements IPooledBlockStore.
 * Checks for the presence of pool-scoped CRUD methods.
 * @param store - The block store to check
 * @returns true if the store implements IPooledBlockStore
 */
export function isPooledBlockStore(
  store: IBlockStore,
): store is IPooledBlockStore {
  return (
    'hasInPool' in store &&
    'putInPool' in store &&
    'getFromPool' in store &&
    'deleteFromPool' in store
  );
}
