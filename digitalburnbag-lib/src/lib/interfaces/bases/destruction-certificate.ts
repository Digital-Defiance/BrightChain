import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IFileNonAccessProofBase } from './file-non-access-proof';

/**
 * An exportable, auditor-facing Certificate of Destruction.
 *
 * Combines the raw cryptographic `IDestructionProof` attestation (signature,
 * treeSeed, nonce, timestamp) with the ledger-verified non-access evidence and
 * human-readable metadata, producing a self-contained document that can be
 * presented to regulators, auditors, or counterparties.
 *
 * Dual-source verification mirrors the vault paper's two independent channels:
 *  1. **Seal channel** — Access Seal HMAC proves whether the key was ever released.
 *  2. **Ledger channel** — Append-only ledger proves whether read events occurred.
 *
 * Both sources are captured here so that a verifier holding only this certificate
 * can confirm:
 *  - The vault was destroyed (signature valid, Merkle chain valid)
 *  - The vault/files were never accessed before destruction (sealStatus === 'pristine')
 *  - No ledger read or key-release entries exist
 *  - Any inconsistency between the two channels is flagged
 *
 * Validates: Requirements 5.5, 6.1–6.6, 15.3, 19.1
 */
export interface IDestructionCertificateBase<TID extends PlatformID> {
  /** Unique ID for this certificate document. */
  id: TID;

  /** Schema version — increment when fields are added or semantics change. */
  version: number;

  // ── Subject ────────────────────────────────────────────────────────────

  /** ID of the vault container that was destroyed. */
  vaultContainerId: TID;

  /** Human-readable name of the vault container at the time of destruction. */
  vaultContainerName: string;

  /** ID of the principal who initiated the destruction request. */
  requesterId: TID;

  // ── Cryptographic attestation ───────────────────────────────────────────

  /**
   * Whether the overall certificate is valid.
   * `false` if signature, Merkle chain, or timestamp validation failed,
   * or if the two verification channels are inconsistent.
   */
  valid: boolean;

  /** secp256k1 signature over treeSeed ‖ nonce ‖ bigEndian64(timestamp). */
  destructionSignature: Uint8Array;

  /** Compressed secp256k1 public key of the creator who signed the destruction. */
  creatorPublicKey: Uint8Array;

  /** Merkle root of the commitment tree at creation time. */
  merkleRoot: Uint8Array;

  /** SHA3-512 HMAC Access Seal at the moment of destruction. */
  accessSealAtDestruction: Uint8Array;

  /** Random 32-byte nonce mixed into the destruction signature. */
  destructionNonce: Uint8Array;

  /** UTC milliseconds when the destruction was signed. */
  destructionTimestamp: number;

  // ── Non-access evidence ────────────────────────────────────────────────

  /**
   * Whether the vault seal was pristine (never released) at destruction time.
   * - `'pristine'`  : key was never released; content was never decrypted
   * - `'accessed'`  : key was released at least once before destruction
   * - `'unknown'`   : seal state could not be determined
   */
  sealStatus: 'pristine' | 'accessed' | 'unknown';

  /**
   * Whether both verification channels agree.
   * `false` signals a snapshot-restore or replay attack was detected.
   */
  ledgerConsistent: boolean;

  /** Total ledger `vault_read_requested` entries for this vault. */
  ledgerReadCount: number;

  /** Total ledger `key_released` entries for this vault. */
  ledgerKeyReleaseCount: number;

  /**
   * Per-file non-access proofs at the time the certificate was generated.
   * Empty for vaults that contain no files, or when file-level proofs were
   * not requested.
   */
  fileNonAccessProofs: Array<IFileNonAccessProofBase<TID>>;

  /** Number of files covered by this certificate. */
  fileCount: number;

  // ── Issuer metadata ────────────────────────────────────────────────────

  /** ID of the verifier service / node that generated this certificate. */
  issuerId: TID;

  /** ISO-8601 timestamp when this certificate was generated. */
  issuedAt: Date | string;

  /**
   * HMAC-SHA3-512 of the canonical certificate payload, signed by the
   * issuer's key.  Allows recipients to detect tampering with the
   * human-readable fields even if the raw crypto fields are untouched.
   */
  issuerSignature: Uint8Array;
}
