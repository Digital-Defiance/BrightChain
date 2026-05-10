import { PlatformID } from '@digitaldefiance/ecies-lib';
import { VaultVisibility } from '../../enumerations/vault-visibility';
import type { IVaultContainerBase } from '../bases/vault-container';
import type { IFileDestructionProof } from '../services/destruction-service';

/**
 * Parameters for creating a new vault container.
 */
export interface ICreateVaultContainerParams<TID extends PlatformID> {
  name: string;
  description?: string;
  ownerId: TID;
  /** Optional per-container storage quota in bytes */
  quotaBytes?: number;
  /** Whether sensitive operations require quorum approval */
  approvalGoverned?: boolean;
  /** Visibility policy for the vault container. Defaults to Private. */
  visibility?: VaultVisibility;
}

/**
 * Partial update fields for a vault container.
 */
export interface IVaultContainerUpdate {
  name?: string;
  description?: string;
  quotaBytes?: number;
  approvalGoverned?: boolean;
}

/**
 * Result of checking a file's access status before reading.
 * Used to warn users that reading will break the cryptographic seal.
 */
export interface IAccessStatusCheck<TID extends PlatformID> {
  fileId: TID;
  /** Current vault state for the file's current version */
  vaultState: string;
  /** True if reading this file will irreversibly break a pristine seal */
  requiresSealBreakConfirmation: boolean;
  /** Human-readable warning message for the UI */
  warningMessage?: string;
}

/**
 * Aggregate seal status for a vault container.
 * Summarizes how many file vaults are pristine, accessed, or destroyed.
 */
export interface IContainerSealStatus<TID extends PlatformID> {
  containerId: TID;
  totalFiles: number;
  totalVersions: number;
  sealedCount: number;
  accessedCount: number;
  destroyedCount: number;
  /** True only if every file vault in the container is pristine */
  allPristine: boolean;
}

/**
 * Result of a vault container cascade destruction.
 */
export interface IContainerDestructionResult<TID extends PlatformID> {
  containerId: TID;
  /** Per-file destruction proofs for files that were successfully destroyed */
  succeeded: Array<{ fileId: TID; proof: IFileDestructionProof }>;
  /** Files that failed to destroy */
  failed: Array<{ fileId: TID; error: string }>;
  /** Ledger entry hash for the container-level destruction record */
  containerLedgerEntryHash: Uint8Array;
  timestamp: Date;
}

/**
 * Result of container-level non-access verification.
 */
export interface IContainerNonAccessResult<TID extends PlatformID> {
  containerId: TID;
  /** True only if every file vault is pristine and ledger confirms no reads */
  nonAccessConfirmed: boolean;
  /** Files that have been accessed (seal broken) */
  accessedFileIds: TID[];
  /** Files with seal/ledger inconsistencies (possible tampering) */
  inconsistentFileIds: TID[];
  totalFilesChecked: number;
}

/**
 * Options for reading a file, including seal break confirmation.
 */
export interface IFileReadOptions {
  /** User has acknowledged the seal break warning */
  confirmSealBreak?: boolean;
}

/**
 * Encrypted file content returned for E2EE download.
 * The server returns ciphertext + per-recipient ECIES-wrapped key;
 * decryption happens entirely on the client.
 */
export interface IEncryptedFileContent {
  /** AES-256-GCM ciphertext bytes */
  encryptedContent: Uint8Array;
  /** AES-GCM IV (12 bytes) */
  iv: Uint8Array;
  /** AES-GCM auth tag (16 bytes) */
  authTag: Uint8Array;
  /** ECIES-wrapped symmetric key for the requester */
  encryptedSymmetricKey: Uint8Array;
}

/**
 * Summary of a vault container for listing/dashboard views.
 */
export interface IVaultContainerSummary<TID extends PlatformID> {
  container: IVaultContainerBase<TID>;
  fileCount: number;
  folderCount: number;
  sealStatus: IContainerSealStatus<TID>;
}
