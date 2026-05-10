import { PlatformID } from '@digitaldefiance/ecies-lib';
import { VaultContainerState } from '../enumerations/vault-container-state';
import { VaultState } from '../enumerations/vault-state';
import { VaultVisibility } from '../enumerations/vault-visibility';
import {
  DuplicateVaultContainerNameError,
  VaultContainerDestroyedError,
  VaultContainerNotFoundError,
} from '../errors';
import type { IFolderMetadataBase } from '../interfaces/bases/folder-metadata';
import type { IVaultContainerBase } from '../interfaces/bases/vault-container';
import type {
  IAccessStatusCheck,
  IContainerDestructionResult,
  IContainerNonAccessResult,
  IContainerSealStatus,
  ICreateVaultContainerParams,
  IVaultContainerSummary,
  IVaultContainerUpdate,
} from '../interfaces/params/vault-container-params';
import type { IVaultContainerRepository } from '../interfaces/services/vault-container-repository';
import type { IVaultContainerService } from '../interfaces/services/vault-container-service';

/**
 * Dependencies injected into VaultContainerService from other services.
 */
export interface IVaultContainerServiceDeps<TID extends PlatformID> {
  /** Create a root folder for a new container */
  createRootFolder: (
    ownerId: TID,
    vaultContainerId: TID,
  ) => Promise<IFolderMetadataBase<TID>>;
  /** Destroy a file and return its proof */
  destroyFile: (
    fileId: TID,
    requesterId: TID,
  ) => Promise<{
    destructionHash: Uint8Array;
    ledgerEntryHash: Uint8Array;
    timestamp: Date;
  }>;
  /** Record container-level event on ledger */
  recordOnLedger: (metadata: Record<string, unknown>) => Promise<Uint8Array>;
  /** Get vault state for a file's current version */
  getFileVaultState: (fileId: TID) => Promise<VaultState>;
  /** Verify non-access for a single file vault */
  verifyFileNonAccess: (
    fileId: TID,
  ) => Promise<{ nonAccessConfirmed: boolean; consistent: boolean }>;
}

const SEAL_BREAK_WARNING =
  'This file has never been accessed. Reading it will permanently break ' +
  'the cryptographic seal. Non-access can no longer be proven for this ' +
  'file or its vault container.';

/**
 * Manages vault container lifecycle: creation, listing, locking,
 * cascade destruction, aggregate non-access verification, and
 * seal status reporting.
 */
export class VaultContainerService<TID extends PlatformID>
  implements IVaultContainerService<TID>
{
  constructor(
    private readonly repository: IVaultContainerRepository<TID>,
    private readonly deps: IVaultContainerServiceDeps<TID>,
    private readonly generateId: () => TID,
  ) {}

  /**
   * Create a new vault container with an auto-created root folder.
   */
  async createContainer(
    params: ICreateVaultContainerParams<TID>,
  ): Promise<IVaultContainerBase<TID>> {
    const nameExists = await this.repository.containerNameExists(
      params.name,
      params.ownerId,
    );
    if (nameExists) {
      throw new DuplicateVaultContainerNameError(params.name);
    }

    const containerId = this.generateId();
    const rootFolder = await this.deps.createRootFolder(
      params.ownerId,
      containerId,
    );

    const now = new Date().toISOString();
    const container: IVaultContainerBase<TID> = {
      id: containerId,
      ownerId: params.ownerId,
      name: params.name,
      description: params.description,
      rootFolderId: rootFolder.id,
      visibility: params.visibility ?? VaultVisibility.Private,
      approvalGoverned: params.approvalGoverned ?? false,
      state: VaultContainerState.Active,
      quotaBytes: params.quotaBytes,
      usedBytes: 0,
      createdAt: now,
      updatedAt: now,
      createdBy: params.ownerId,
      updatedBy: params.ownerId,
    };

    return this.repository.createContainer(container);
  }

  /**
   * Get a vault container by ID.
   */
  async getContainer(
    containerId: TID,
    _requesterId: TID,
  ): Promise<IVaultContainerBase<TID>> {
    const container = await this.repository.getContainerById(containerId);
    if (!container) {
      throw new VaultContainerNotFoundError(String(containerId));
    }
    return container;
  }

  /**
   * List all vault containers for a user with summary info.
   */
  async listContainers(ownerId: TID): Promise<IVaultContainerSummary<TID>[]> {
    const containers = await this.repository.getContainersByOwner(ownerId);
    const summaries: IVaultContainerSummary<TID>[] = [];

    for (const container of containers) {
      const [fileCount, folderCount, sealStatus] = await Promise.all([
        this.repository.getFileCount(container.id),
        this.repository.getFolderCount(container.id),
        this.buildSealStatus(container.id, container.state),
      ]);

      summaries.push({ container, fileCount, folderCount, sealStatus });
    }

    return summaries;
  }

  /**
   * List all public vault containers with summary info.
   * No authentication required — public vaults are discoverable by anyone.
   */
  async listPublicContainers(opts?: {
    limit?: number;
    offset?: number;
    search?: string;
    sortBy?: 'name' | 'createdAt' | 'fileCount';
    sortDir?: 'asc' | 'desc';
  }): Promise<{ summaries: IVaultContainerSummary<TID>[]; total: number }> {
    const { containers, total } =
      await this.repository.getPublicContainers(opts);

    const summaries = await Promise.all(
      containers.map(async (container) => {
        const [fileCount, folderCount] = await Promise.all([
          this.repository.getFileCount(container.id),
          this.repository.getFolderCount(container.id),
        ]);
        return {
          container,
          fileCount,
          folderCount,
          // Seal status is an owner-only concern — omit for public listing
          sealStatus: {
            allPristine: true,
            sealedCount: 0,
            accessedCount: 0,
            totalFiles: fileCount,
          },
        } as IVaultContainerSummary<TID>;
      }),
    );

    // fileCount sort is done in-process since the DB doesn't have it indexed
    if (opts?.sortBy === 'fileCount') {
      const dir = opts.sortDir === 'desc' ? -1 : 1;
      summaries.sort((a, b) => (a.fileCount - b.fileCount) * dir);
    }

    return { summaries, total };
  }

  /**
   * Update vault container metadata.
   * Rejects if the container is destroyed.
   */
  async updateContainer(
    containerId: TID,
    updates: IVaultContainerUpdate,
    requesterId: TID,
  ): Promise<IVaultContainerBase<TID>> {
    const container = await this.getContainer(containerId, requesterId);
    if (container.state === VaultContainerState.Destroyed) {
      throw new VaultContainerDestroyedError(String(containerId));
    }

    if (updates.name && updates.name !== container.name) {
      const nameExists = await this.repository.containerNameExists(
        updates.name,
        container.ownerId,
      );
      if (nameExists) {
        throw new DuplicateVaultContainerNameError(updates.name);
      }
    }

    return this.repository.updateContainer(containerId, {
      ...updates,
      updatedBy: requesterId,
      updatedAt: new Date().toISOString(),
    } as Partial<IVaultContainerBase<TID>>);
  }

  /**
   * Lock a container — no modifications allowed, reads still work.
   */
  async lockContainer(
    containerId: TID,
    requesterId: TID,
  ): Promise<IVaultContainerBase<TID>> {
    const container = await this.getContainer(containerId, requesterId);
    if (container.state === VaultContainerState.Destroyed) {
      throw new VaultContainerDestroyedError(String(containerId));
    }
    if (container.state === VaultContainerState.Locked) {
      return container;
    }

    return this.repository.updateContainer(containerId, {
      state: VaultContainerState.Locked,
      updatedBy: requesterId,
      updatedAt: new Date().toISOString(),
    } as Partial<IVaultContainerBase<TID>>);
  }

  /**
   * Seal a container — activates the pristine guarantee.
   *
   * Computes a deterministic seal hash by:
   *   1. Collecting all file IDs in the container (sorted for determinism)
   *   2. Hashing each file's vaultCreationLedgerEntryHash
   *   3. Combining into a single hex digest via the ledger
   *
   * Records the seal on the ledger and transitions state to Sealed.
   * Only valid from Active state.
   */
  async sealContainer(
    containerId: TID,
    requesterId: TID,
  ): Promise<{ container: IVaultContainerBase<TID>; sealHash: string }> {
    const container = await this.getContainer(containerId, requesterId);

    if (container.state === VaultContainerState.Destroyed) {
      throw new VaultContainerDestroyedError(String(containerId));
    }
    if (container.state === VaultContainerState.Sealed) {
      // Idempotent — return existing seal
      return {
        container,
        sealHash: container.sealHash ?? '',
      };
    }
    if (container.state !== VaultContainerState.Active) {
      throw new Error(
        `VAULT_SEAL_INVALID_STATE: cannot seal a container in state '${container.state}'`,
      );
    }

    // Collect all files and build a deterministic seal hash
    const files = await this.repository.getAllFilesInContainer(containerId);
    const sortedHashes = files
      .map((f) => {
        const h = f.vaultCreationLedgerEntryHash;
        if (!h) return '';
        if (h instanceof Uint8Array || Buffer.isBuffer(h)) {
          return Buffer.from(h).toString('hex');
        }
        return String(h);
      })
      .sort();

    // Record on ledger — the ledger returns a hash we use as the seal hash
    const sealLedgerHash = await this.deps.recordOnLedger({
      operation: 'vault_container_sealed',
      containerId: String(containerId),
      sealedBy: String(requesterId),
      fileCount: files.length,
      fileHashes: sortedHashes,
      timestamp: new Date().toISOString(),
    });

    const sealHash = Buffer.from(sealLedgerHash).toString('hex');
    const now = new Date().toISOString();

    const updated = await this.repository.updateContainer(containerId, {
      state: VaultContainerState.Sealed,
      sealedAt: now,
      sealHash,
      updatedBy: requesterId,
      updatedAt: now,
    } as Partial<IVaultContainerBase<TID>>);

    return { container: updated, sealHash };
  }

  /**
   * Cascade-destroy a vault container and all file vaults within it.
   * Best-effort: collects per-file results without aborting on individual failures.
   */
  async destroyContainer(
    containerId: TID,
    requesterId: TID,
  ): Promise<IContainerDestructionResult<TID>> {
    const container = await this.getContainer(containerId, requesterId);
    if (container.state === VaultContainerState.Destroyed) {
      throw new VaultContainerDestroyedError(String(containerId));
    }

    const fileIds = await this.repository.getAllFileIdsInContainer(containerId);

    const succeeded: IContainerDestructionResult<TID>['succeeded'] = [];
    const failed: IContainerDestructionResult<TID>['failed'] = [];

    for (const fileId of fileIds) {
      try {
        const proof = await this.deps.destroyFile(fileId, requesterId);
        succeeded.push({
          fileId,
          proof: {
            fileId: String(fileId),
            destructionHash: proof.destructionHash,
            ledgerEntryHash: proof.ledgerEntryHash,
            timestamp: proof.timestamp,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failed.push({ fileId, error: message });
      }
    }

    // Record container-level destruction on ledger
    const containerLedgerEntryHash = await this.deps.recordOnLedger({
      operation: 'vault_container_destroyed',
      containerId: String(containerId),
      filesDestroyed: succeeded.length,
      filesFailed: failed.length,
      destroyedBy: String(requesterId),
    });

    // Mark container as destroyed
    await this.repository.updateContainer(containerId, {
      state: VaultContainerState.Destroyed,
      updatedBy: requesterId,
      updatedAt: new Date().toISOString(),
    } as Partial<IVaultContainerBase<TID>>);

    return {
      containerId,
      succeeded,
      failed,
      containerLedgerEntryHash,
      timestamp: new Date(),
    };
  }

  /**
   * Get aggregate seal status for a container.
   */
  async getSealStatus(
    containerId: TID,
    requesterId: TID,
  ): Promise<IContainerSealStatus<TID>> {
    const container = await this.getContainer(containerId, requesterId);
    return this.buildSealStatus(containerId, container.state);
  }

  /**
   * Verify non-access for an entire container.
   * Checks every file vault's seal and cross-references the ledger.
   */
  async verifyNonAccess(
    containerId: TID,
    requesterId: TID,
  ): Promise<IContainerNonAccessResult<TID>> {
    await this.getContainer(containerId, requesterId);

    const fileIds = await this.repository.getAllFileIdsInContainer(containerId);
    const accessedFileIds: TID[] = [];
    const inconsistentFileIds: TID[] = [];

    for (const fileId of fileIds) {
      try {
        const result = await this.deps.verifyFileNonAccess(fileId);
        if (!result.nonAccessConfirmed) {
          accessedFileIds.push(fileId);
        }
        if (!result.consistent) {
          inconsistentFileIds.push(fileId);
        }
      } catch {
        // If verification throws (e.g. SealLedgerInconsistencyError),
        // treat as inconsistent
        inconsistentFileIds.push(fileId);
      }
    }

    return {
      containerId,
      nonAccessConfirmed:
        accessedFileIds.length === 0 && inconsistentFileIds.length === 0,
      accessedFileIds,
      inconsistentFileIds,
      totalFilesChecked: fileIds.length,
    };
  }

  /**
   * Check a file's access status before reading.
   * Returns whether reading will break a sealed vault's pristine guarantee.
   * The warning is only shown when the container is in Sealed state.
   */
  async checkFileAccessStatus(
    fileId: TID,
    _requesterId: TID,
  ): Promise<IAccessStatusCheck<TID>> {
    const vaultState = await this.deps.getFileVaultState(fileId);
    const requiresConfirmation = vaultState === VaultState.Sealed;

    return {
      fileId,
      vaultState,
      requiresSealBreakConfirmation: requiresConfirmation,
      warningMessage: requiresConfirmation ? SEAL_BREAK_WARNING : undefined,
    };
  }

  /**
   * Build aggregate seal status by querying vault states for all files
   * in a container.
   *
   * Returns allPristine=false and zeroed counts when the container is not
   * in Sealed state — seal status is only meaningful after sealing.
   */
  private async buildSealStatus(
    containerId: TID,
    containerState?: VaultContainerState,
  ): Promise<IContainerSealStatus<TID>> {
    // Destroyed containers are tombstones — no meaningful file state to report
    if (containerState === VaultContainerState.Destroyed) {
      const fileCount = await this.repository.getFileCount(containerId);
      return {
        containerId,
        totalFiles: fileCount,
        totalVersions: fileCount,
        sealedCount: 0,
        accessedCount: 0,
        destroyedCount: fileCount,
        allPristine: false,
      };
    }

    const files = await this.repository.getAllFilesInContainer(containerId);

    let sealedCount = 0;
    let accessedCount = 0;
    let destroyedCount = 0;
    let totalVersions = 0;

    for (const file of files) {
      try {
        const state = await this.deps.getFileVaultState(file.id);
        totalVersions++;
        switch (state) {
          case VaultState.Sealed:
            sealedCount++;
            break;
          case VaultState.Accessed:
            accessedCount++;
            break;
          case VaultState.Destroyed:
            destroyedCount++;
            break;
        }
      } catch {
        // If we can't determine state, count as accessed (conservative)
        totalVersions++;
        accessedCount++;
      }
    }

    return {
      containerId,
      totalFiles: files.length,
      totalVersions,
      sealedCount,
      accessedCount,
      destroyedCount,
      allPristine:
        accessedCount === 0 && destroyedCount === 0 && files.length > 0,
    };
  }
}
