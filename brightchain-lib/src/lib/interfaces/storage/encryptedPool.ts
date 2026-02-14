/**
 * Encrypted pool storage types and configuration.
 *
 * Defines encryption modes for pools, configuration for encrypted storage,
 * and key version tracking for key rotation support.
 *
 * Uses Uint8Array (not Buffer) for browser compatibility.
 * Generic type parameters support DTO flexibility (string for frontend,
 * Uint8Array for backend node IDs).
 */

import { PoolId } from './pooledBlockStore';

/**
 * Encryption modes for pool storage.
 * - None: no encryption applied
 * - NodeSpecific: encrypted with the storing node's key; only that node can decrypt
 * - PoolShared: encrypted with a shared pool key; any pool member can decrypt
 */
export enum EncryptionMode {
  None = 'none',
  NodeSpecific = 'node-specific',
  PoolShared = 'pool-shared',
}

/**
 * Options for configuring encryption on a pool at creation time.
 */
export interface IEncryptedPoolOptions {
  encryptionMode: EncryptionMode;
  /** Fields that remain unencrypted for search (e.g., ['blockSize', 'createdAt']) */
  searchableMetadataFields?: string[];
}

/**
 * A single key version entry, tracking the key material and its lifecycle.
 * For pool-shared mode, the symmetric key is encrypted per-member via ECIES.
 *
 * Generic TNodeId allows string for frontend, Uint8Array for backend.
 */
export interface IKeyVersion<TNodeId = string> {
  version: number;
  createdAt: Date;
  /** For pool-shared: the symmetric key encrypted per-member */
  encryptedKeys?: Array<{
    nodeId: TNodeId;
    encryptedKey: Uint8Array; // ECIES-encrypted symmetric key
  }>;
  /** Whether this key version is still valid for decryption */
  active: boolean;
}

/**
 * Pool encryption configuration stored alongside the pool.
 * Tracks the encryption mode, searchable fields, and full key version history
 * so older blocks can still be decrypted after key rotation.
 *
 * Generic TNodeId allows string for frontend, Uint8Array for backend.
 */
export interface IPoolEncryptionConfig<TNodeId = string> {
  poolId: PoolId;
  mode: EncryptionMode;
  searchableMetadataFields: string[];
  /** Key version history for decrypting older blocks */
  keyVersions: IKeyVersion<TNodeId>[];
  /** Current active key version */
  currentKeyVersion: number;
}
