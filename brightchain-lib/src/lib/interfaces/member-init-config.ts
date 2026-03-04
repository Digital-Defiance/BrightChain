import { BlockSize } from '../enumerations';

/**
 * BrightChain-native configuration for BrightChainMemberInitService.
 * Contains only what the service needs — no Mongoose, no Express.
 */
export interface IBrightChainMemberInitConfig {
  /** Pool name used as the BrightDb name and poolId */
  memberPoolName: string;
  /**
   * Filesystem path for the disk block store.
   * When set (and useMemoryStore is false), a DiskBlockStore and
   * PersistentHeadRegistry are used so data survives process restarts.
   */
  blockStorePath?: string;
  /** Force in-memory store even when blockStorePath is set */
  useMemoryStore?: boolean;
  /** Block size for the store (defaults to BlockSize.Medium) */
  blockSize?: BlockSize;
}
