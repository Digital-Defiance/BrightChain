/**
 * CBL Index interfaces for tracking whitened CBL storage results.
 *
 * The CBL Index is a higher-level registry — distinct from ICBLStore which
 * handles raw CBL block storage. It tracks magnet URLs, block ID pairs,
 * metadata, pool scoping, user-level organization, and file version history.
 *
 * All interfaces use generic type parameters for DTO flexibility:
 * - Frontend: TId = string
 * - Backend: TId = GuidV4Buffer or similar
 */

import type { PoolId } from './pooledBlockStore';

/**
 * Visibility levels for CBL index entries.
 * Controls who can see and access a CBL entry.
 */
export enum CBLVisibility {
  /** Only the creator can see this entry */
  Private = 'private',
  /** Creator and explicitly shared users can see this entry */
  Shared = 'shared',
  /** All pool members can see this entry */
  Public = 'public',
}

/**
 * Optional user-facing metadata attached to a CBL index entry.
 */
export interface ICBLMetadata {
  /** Original file name */
  fileName?: string;
  /** MIME type of the original content */
  mimeType?: string;
  /** Original uncompressed size in bytes */
  originalSize?: number;
  /** User-defined tags for categorization */
  tags?: string[];
}

/**
 * A CBL index entry tracking a whitened CBL storage result.
 *
 * Generic TId allows string for frontend DTO, or a buffer type for backend.
 */
export interface ICBLIndexEntry<TId = string> {
  /** Unique entry ID */
  _id: string;
  /** Full magnet URL for CBL reconstruction */
  magnetUrl: string;
  /** First XOR component block ID (hex) */
  blockId1: string;
  /** Second XOR component block ID (hex) */
  blockId2: string;
  /** Block size used for storage */
  blockSize: number;
  /** Pool this CBL belongs to (undefined = default pool) */
  poolId?: PoolId;
  /** When the CBL was stored */
  createdAt: Date;
  /** Member ID of the creator */
  createdBy?: TId;
  /** Visibility level */
  visibility: CBLVisibility;
  /** Soft-delete timestamp (undefined = not deleted) */
  deletedAt?: Date;
  /** Optional user-facing metadata */
  metadata?: ICBLMetadata;
  /** FEC parity block IDs for each XOR component */
  parityBlockIds?: {
    block1: string[];
    block2: string[];
  };
  /** User collection/folder this entry belongs to */
  userCollection?: string;
  /** Users this CBL is shared with (for Shared visibility) */
  sharedWith?: TId[];
  /** Sequence number for sync ordering */
  sequenceNumber: number;
  /** Stable ID grouping all versions of the same logical file */
  fileId?: string;
  /** Version number within the file group (1-based positive integer) */
  versionNumber?: number;
  /** Magnet URL of the previous version (audit chain) */
  previousVersion?: string;
  /** Encrypted field values (base64-encoded ciphertext), keyed by field name */
  encryptedFields?: Record<string, string>;
  /**
   * Whether this entry has a conflict with another entry sharing the same magnet URL.
   * Set during cross-node merge when the same magnet URL arrives with different content.
   *
   * @see Requirements 8.3
   */
  hasConflict?: boolean;
  /**
   * Entry IDs of conflicting entries that share the same magnet URL.
   * Populated during cross-node merge for conflict resolution tracking.
   *
   * @see Requirements 8.3
   */
  conflictsWith?: string[];
}

/**
 * Query options for searching and filtering CBL index entries.
 * All filter fields are optional; only specified fields are applied.
 */
export interface ICBLIndexQueryOptions {
  /** Filter by pool ID */
  poolId?: string;
  /** Filter by creator member ID */
  createdBy?: string;
  /** Filter by visibility level */
  visibility?: CBLVisibility;
  /** Filter by user collection/folder name */
  userCollection?: string;
  /** Filter by file name (from metadata) */
  fileName?: string;
  /** Filter by MIME type (from metadata) */
  mimeType?: string;
  /** Filter by tags (entries must have all specified tags) */
  tags?: string[];
  /** Filter by file ID (version group) */
  fileId?: string;
  /** Include soft-deleted entries (default: false) */
  includeDeleted?: boolean;
  /** Maximum number of entries to return */
  limit?: number;
  /** Number of entries to skip (for pagination) */
  offset?: number;
  /** Field to sort results by */
  sortBy?: 'createdAt' | 'fileName' | 'originalSize' | 'versionNumber';
  /** Sort direction */
  sortOrder?: 'asc' | 'desc';
  /**
   * When set, applies visibility-based access control filtering:
   * - Private entries: only returned if createdBy === requestingUserId
   * - Shared entries: only returned if createdBy === requestingUserId OR sharedWith includes requestingUserId
   * - Public entries: always returned
   *
   * When not set, no visibility access control is applied (all matching entries returned).
   */
  requestingUserId?: string;
}
