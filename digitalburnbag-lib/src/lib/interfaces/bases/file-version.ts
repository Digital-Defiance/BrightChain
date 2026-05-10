import { PlatformID } from '@digitaldefiance/ecies-lib';

/**
 * A single version snapshot of a file.
 * Each version has its own Vault and Recipe for independent
 * encryption, destruction, and non-access proofs.
 */
export interface IFileVersionBase<TID extends PlatformID> {
  id: TID;
  fileId: TID;
  versionNumber: number;
  sizeBytes: number;
  vaultCreationLedgerEntryHash: Uint8Array;
  /** Vault state: sealed, accessed, destroyed */
  vaultState: string;
  uploaderId: TID;
  createdAt: Date | string;
}
