import { BlockStoreOptions } from './blockMetadata';

/**
 * Result of storing a CBL with XOR whitening.
 * Contains the IDs of both XOR components and a magnet URL for reconstruction.
 */
export interface CBLStorageResult {
  /**
   * First block ID - one of the XOR components (hex string)
   */
  blockId1: string;

  /**
   * Second block ID - the other XOR component (hex string)
   */
  blockId2: string;

  /**
   * The block size used for storage
   */
  blockSize: number;

  /**
   * The magnet URL for reconstruction
   */
  magnetUrl: string;

  /**
   * Parity block IDs for block 1 (if FEC redundancy enabled)
   */
  block1ParityIds?: string[];

  /**
   * Parity block IDs for block 2 (if FEC redundancy enabled)
   */
  block2ParityIds?: string[];

  /**
   * Whether the CBL is encrypted
   */
  isEncrypted?: boolean;
}

/**
 * Components extracted from a whitened CBL magnet URL.
 * Contains the block IDs, block size, parity IDs, and encryption flag.
 */
export interface CBLMagnetComponents {
  /**
   * First block ID (hex string)
   */
  blockId1: string;

  /**
   * Second block ID (hex string)
   */
  blockId2: string;

  /**
   * Block size in bytes
   */
  blockSize: number;

  /**
   * Parity block IDs for block 1 (if present in URL)
   */
  block1ParityIds?: string[];

  /**
   * Parity block IDs for block 2 (if present in URL)
   */
  block2ParityIds?: string[];

  /**
   * Whether the CBL is encrypted
   */
  isEncrypted: boolean;
}

/**
 * Options for CBL whitening storage operations.
 * Extends BlockStoreOptions with encryption flag.
 */
export interface CBLWhiteningOptions extends BlockStoreOptions {
  /**
   * Whether the CBL data is encrypted
   */
  isEncrypted?: boolean;
}
