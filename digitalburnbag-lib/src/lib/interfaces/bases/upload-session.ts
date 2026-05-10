import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { BurnbagStorageTier } from '../../joule/burnbagDurability';

/**
 * Upload session tracking chunked file uploads with resume capability.
 */
export interface IUploadSessionBase<TID extends PlatformID> {
  id: TID;
  userId: TID;
  fileName: string;
  mimeType: string;
  totalSizeBytes: number;
  chunkSizeBytes: number;
  totalChunks: number;
  receivedChunks: Set<number>;
  /** Per-chunk checksums for integrity */
  chunkChecksums: Map<number, string>;
  expiresAt: Date | string;
  createdAt: Date | string;
  /** Target folder for the uploaded file */
  targetFolderId: TID;
  /** Vault container for the uploaded file */
  vaultContainerId: TID;

  // ── Joule escrow fields ──────────────────────────────────────────────────
  // All fields below are undefined when BURNBAG_JOULE_ENABLED=false.

  /** User-selected durability tier. Required at session creation when Joule is enabled. */
  durabilityTier?: BurnbagStorageTier;
  /** Committed storage duration in days. Required at session creation when Joule is enabled. */
  durationDays?: number;
  /** Session lifecycle state. Defaults to 'uploading'. */
  state?: 'uploading' | 'quoted';
  /** ISO timestamp set by quote(). */
  quotedAt?: string;
  /** ISO timestamp: now + BURNBAG_QUOTE_TTL_MS. Quote expires after this. */
  quoteExpiresAt?: string;
  /** Authoritative upfront charge computed from blockAlignedBytes (bigint as string). */
  quotedUpfrontMicroJoules?: string;
  /** Authoritative daily charge computed from blockAlignedBytes (bigint as string). */
  quotedDailyMicroJoules?: string;
  /** Block-aligned encrypted byte count used for the quote. */
  quotedBlockAlignedBytes?: number;
  /** RS data shards resolved at quote time. */
  quotedRsK?: number;
  /** RS parity shards resolved at quote time. */
  quotedRsM?: number;
  /** DebitAuthorization op ID — used to capture() or release() the reserved Joules. */
  jouleOpId?: string;

  // ── Client-side E2EE upload fields ──────────────────────────────────────
  // When the client pre-encrypts a file before uploading, these fields carry
  // the base64-encoded ECIES-wrapped symmetric key and AES-GCM IV/authTag so
  // that finalize() can store them without performing server-side encryption.

  /**
   * Base64-encoded ECIES-wrapped symmetric key generated client-side.
   * Present only when the client performed E2EE encryption before upload.
   */
  preEncryptedWrappedKeyB64?: string;
  /**
   * Base64-encoded 12-byte AES-GCM IV used by the client for encryption.
   */
  preEncryptedIvB64?: string;
  /**
   * Base64-encoded 16-byte AES-GCM authentication tag from the client encryption.
   */
  preEncryptedAuthTagB64?: string;
}
