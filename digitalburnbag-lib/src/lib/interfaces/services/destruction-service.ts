import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * Cryptographic proof that a file has been irreversibly destroyed.
 * Distinguished from vault-level IDestructionProof (in vault.ts) which
 * covers the low-level tree-seed / nonce / signature attestation.
 */
export interface IFileDestructionProof {
  fileId: string;
  destructionHash: Uint8Array;
  ledgerEntryHash: Uint8Array;
  timestamp: Date;
}

/**
 * Bundle used to verify a file destruction proof against the ledger.
 * Distinguished from vault-level IVerificationBundle (in vault.ts).
 */
export interface IFileVerificationBundle {
  proof: IFileDestructionProof;
  ledgerEntryHash: Uint8Array;
}

/**
 * Result of verifying a file destruction proof.
 * Distinguished from vault-level IProofVerificationResult (in vault.ts).
 */
export interface IFileProofVerificationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Result of a file-level batch destruction operation.
 * Distinguished from IBatchDestructionResult in params/destruction-results.ts
 * which uses a simpler shape without per-file proofs.
 */
export interface IFileBatchDestructionResult<TID extends PlatformID> {
  succeeded: Array<{ fileId: TID; proof: IFileDestructionProof }>;
  failed: Array<{ fileId: TID; error: string }>;
}

/**
 * Service interface for file destruction operations.
 * Manages immediate destruction, scheduled destruction, batch operations,
 * and cryptographic proof verification.
 */
export interface IDestructionService<TID extends PlatformID> {
  /** Destroy a file immediately, returning a cryptographic proof */
  destroyFile(fileId: TID, requesterId: TID): Promise<IFileDestructionProof>;

  /** Destroy multiple files, collecting results without throwing on individual failures */
  batchDestroy(
    fileIds: TID[],
    requesterId: TID,
  ): Promise<IFileBatchDestructionResult<TID>>;

  /** Schedule a file for future destruction */
  scheduleDestruction(
    fileId: TID,
    scheduledAt: Date,
    requesterId: TID,
  ): Promise<void>;

  /** Cancel a previously scheduled destruction */
  cancelScheduledDestruction(fileId: TID, requesterId: TID): Promise<void>;

  /** Execute all destructions whose scheduled time has passed */
  executeScheduledDestructions(): Promise<IFileBatchDestructionResult<TID>>;

  /** Verify a destruction proof against a verification bundle */
  verifyDestruction(
    proof: IFileDestructionProof,
    bundle: IFileVerificationBundle,
  ): IFileProofVerificationResult;

  /** Purge trash items that have exceeded the retention period */
  purgeExpiredTrash(): Promise<IFileBatchDestructionResult<TID>>;
}
