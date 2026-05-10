/**
 * Exportable Certificate of Destruction — a server-signed JSON document
 * proving a sealed vault was destroyed without its contents being accessed.
 *
 * Designed for offline verification: a third party holding only this
 * certificate and the operator's public key can confirm destruction
 * and non-access independently of the server.
 *
 * Distinct from {@link IDestructionCertificateBase} which is an internal
 * verification record. This interface is the auditor-facing, ECDSA-signed
 * certificate that bundles the container-level non-access result, per-file
 * destruction proofs, and operator signature.
 */
export interface ICertificateOfDestruction {
  /** Certificate format version. Initially 1. */
  version: number;
  /** ID of the vault container that was destroyed. */
  containerId: string;
  /** Human-readable name of the vault container at destruction time. */
  containerName: string;
  /** Hex-encoded Merkle root recorded at seal time. */
  sealHash: string;
  /** ISO-8601 timestamp when the vault was sealed. */
  sealedAt: string;
  /** ISO-8601 timestamp when the vault was destroyed. */
  destroyedAt: string;
  /** Full non-access verification result. */
  nonAccessVerification: ICertificateNonAccessVerification;
  /** Per-file destruction proofs. */
  fileDestructionProofs: ICertificateFileDestructionProof[];
  /** Hex-encoded ledger entry hash for the container destruction record. */
  containerLedgerEntryHash: string;
  /** Hex-encoded compressed secp256k1 operator public key. */
  operatorPublicKey: string;
  /**
   * Base64-encoded 64-byte compact ECDSA signature over the SHA-256 hash
   * of the canonical JSON payload (all fields except `signature`).
   */
  signature: string;
}

/**
 * Serializable subset of `IContainerNonAccessResult` for embedding in the
 * certificate. Uses string IDs instead of `TID` for portability.
 */
export interface ICertificateNonAccessVerification {
  /** ID of the vault container that was verified. */
  containerId: string;
  /** Whether non-access was confirmed for all files. */
  nonAccessConfirmed: boolean;
  /** IDs of files that were accessed before destruction. */
  accessedFileIds: string[];
  /** IDs of files with inconsistent seal/ledger state. */
  inconsistentFileIds: string[];
  /** Total number of files checked during verification. */
  totalFilesChecked: number;
}

/**
 * Serializable subset of `IFileDestructionProof` for embedding in the
 * certificate. Uses hex-encoded hashes instead of `Uint8Array`.
 */
export interface ICertificateFileDestructionProof {
  /** ID of the file vault that was destroyed. */
  fileId: string;
  /** Hex-encoded destruction hash. */
  destructionHash: string;
  /** Hex-encoded ledger entry hash. */
  ledgerEntryHash: string;
  /** ISO-8601 timestamp of the file destruction. */
  timestamp: string;
}

/**
 * Result of verifying a Certificate of Destruction against an operator
 * public key.
 */
export interface ICertificateVerifyResult {
  /** Whether the certificate signature is valid. */
  valid: boolean;
  /** Reason for verification failure, if applicable. */
  reason?: 'SIGNATURE_MISMATCH';
}
