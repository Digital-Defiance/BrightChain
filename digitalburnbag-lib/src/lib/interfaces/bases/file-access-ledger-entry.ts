import { PlatformID } from '@digitaldefiance/ecies-lib';
import { IAuditEntryBase } from './audit-entry';

/**
 * How the file content was accessed.
 * - `direct`: The requesting actor held a valid decryption key grant.
 * - `share_link`: Access was granted through a time-limited share link.
 * - `public`: File is publicly visible; no key grant required.
 */
export type FileAccessMethod = 'direct' | 'share_link' | 'public';

/**
 * A single append-only ledger entry recording that file content was requested.
 * Written to the ledger BEFORE the file bytes are returned, mirroring the
 * vault-level `vault_read_requested` convention from the DigitalBurnBag vault paper.
 *
 * Together with the vault-level Access Seal, this provides two independent
 * non-access proof sources at file granularity:
 *  1. Seal check  — detects whether the file's HMAC was mutated (accessed).
 *  2. Ledger check — zero `file_read_requested` / `file_downloaded` entries
 *                    prove content was never transmitted.
 */
export interface IFileAccessLedgerEntryBase<TID extends PlatformID>
  extends IAuditEntryBase<TID> {
  /** ID of the file whose content was requested. */
  fileId: TID;
  /** Vault container that owns this file (for scoped non-access proofs). */
  vaultContainerId: TID;
  /**
   * Ephemeral public key of the requester at the time of the request.
   * Stored as a hex-encoded secp256k1 compressed public key.
   */
  requesterPublicKey: string;
  /** How the file was accessed. */
  accessMethod: FileAccessMethod;
  /** ID of the share link, when `accessMethod` is `share_link`. */
  shareLinkId?: TID;
  /**
   * Whether the file content was actually transmitted.
   * A `file_read_requested` entry may exist without a corresponding
   * `file_downloaded` entry if the transfer was aborted.
   */
  contentTransmitted: boolean;
  /** Byte range requested, if a partial download was made. */
  byteRangeStart?: number;
  byteRangeEnd?: number;
}
