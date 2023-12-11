import { IProcessingParams } from './processingParams';

/**
 * Vault visibility level for container creation.
 * Mirrors VaultVisibility from digitalburnbag-lib as a string union
 * to avoid a circular build dependency (digitalburnbag-lib depends on
 * brightchain-lib). Consumers can pass VaultVisibility enum values
 * directly since they are string-backed.
 */
export type StagingVaultVisibility = 'private' | 'unlisted' | 'public';

/**
 * Request body for committing a staged file to permanent vault storage.
 * Callers must provide either vaultContainerId or createContainer.
 */
export interface ICommitRequest<TId = string> {
  /** Existing vault container to store the file in */
  vaultContainerId?: TId;
  /** Target folder within the vault container */
  targetFolderId?: TId;
  /** Create a new vault container for this file */
  createContainer?: {
    name: string;
    ownerId: TId;
    visibility?: StagingVaultVisibility;
  };
  /** Optional image processing to apply before storing */
  processingParams?: IProcessingParams;
}
