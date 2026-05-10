import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * A verifiable claim that a specific file was never accessed.
 *
 * Mirrors the vault-level `VerificationBundle` from the DigitalBurnBag vault paper
 * but scoped to individual file content rather than the vault primitive.
 *
 * Dual-source verification:
 *  1. **Seal result** — whether the file's Access Seal HMAC was pristine (not mutated).
 *  2. **Ledger scan** — zero `file_read_requested` / `file_downloaded` entries
 *     for this file within [`fromSequenceNumber`, `toSequenceNumber`].
 *
 * Both sources must agree for the proof to be valid.
 */
export interface IFileNonAccessProofBase<TID extends PlatformID> {
  /** Unique ID of this proof document. */
  id: TID;
  /** The file this proof covers. */
  fileId: TID;
  /** Vault container that owns the file. */
  vaultContainerId: TID;
  /**
   * Inclusive ledger sequence range that was scanned.
   * The prover guarantees no file-level access events exist in this window.
   */
  fromSequenceNumber: number;
  toSequenceNumber: number;
  /** Number of ledger entries scanned (all must be non-access ops). */
  ledgerEntriesScanned: number;
  /** Number of access-event entries found — must be 0 for a valid proof. */
  accessEventCount: number;
  /**
   * Result of the file's Access Seal check.
   * `true` means the HMAC matched the pristine (never-accessed) value.
   */
  sealPristine: boolean;
  /** Hash of the last ledger entry in the scanned range, for chain continuity. */
  ledgerTailHash: Uint8Array;
  /** HMAC of the proof payload, signed by the verifier's key. */
  verifierSignature: Uint8Array;
  /** ID of the verifier node / service that produced this proof. */
  verifierId: TID;
  /** ISO-8601 timestamp when the proof was generated. */
  generatedAt: Date | string;
  /**
   * Whether the proof is currently valid.
   * Becomes false if a subsequent access event is recorded.
   */
  isValid: boolean;
}
