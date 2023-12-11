import { BlockSize } from '@brightchain/brightchain-lib';

/**
 * Pool encryption configuration for securing the member pool.
 * When enabled, the pool is created with `EncryptionMode.PoolShared` and
 * an ACL restricting write access to authorized nodes.
 */
export interface IPoolEncryptionInit {
  /** Enable pool encryption and ACL enforcement (default: false for backward compat) */
  enabled: boolean;
  /** System user's ECIES public key (compressed secp256k1, 33 bytes) for encrypting the pool key */
  systemUserPublicKey: Uint8Array;
  /** System user's ECIES private key (32 bytes) for signing the ACL and decrypting the pool key */
  systemUserPrivateKey: Uint8Array;
  /** System user's node/member ID (string form) for the ACL owner field */
  systemUserId: string;
}

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
  /**
   * Human-readable label for the block store backend (e.g. "azure-blob", "s3").
   * Used only for log output. When unset, falls back to blockStorePath or
   * "in-memory (ephemeral)".
   */
  blockStoreLabel?: string;
  /**
   * Pool encryption and ACL configuration.
   * When provided and enabled, the member pool is created with PoolShared
   * encryption and an ACL restricting access to authorized nodes.
   * When omitted, the pool operates in open mode (backward compatible).
   */
  poolEncryption?: IPoolEncryptionInit;
}
