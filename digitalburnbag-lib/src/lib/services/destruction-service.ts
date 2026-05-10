import { PlatformID } from '@digitaldefiance/ecies-lib';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import {
  FileNotFoundError,
  ScheduledDestructionNotFoundError,
} from '../errors';
import type { IAuditEntryParams } from '../interfaces/params/audit-service-params';
import type { IDestructionRepository } from '../interfaces/services/destruction-repository';
import type {
  IDestructionService,
  IFileBatchDestructionResult,
  IFileDestructionProof,
  IFileProofVerificationResult,
  IFileVerificationBundle,
} from '../interfaces/services/destruction-service';

/**
 * Dependencies injected into DestructionService that come from other services.
 */
export interface IDestructionServiceDeps<TID extends PlatformID> {
  /** Destroy a vault and get destruction proof */
  destroyVault: (
    vaultCreationLedgerEntryHash: Uint8Array,
  ) => Promise<{ destructionHash: Uint8Array }>;
  /** Revoke all key wrapping entries for a file version */
  revokeAllWrappings: (fileVersionId: TID, requesterId: TID) => Promise<number>;
  /** Record destruction on ledger */
  recordOnLedger: (metadata: Record<string, unknown>) => Promise<Uint8Array>;
  /** Verify a destruction proof */
  verifyProof: (
    proof: IFileDestructionProof,
    bundle: IFileVerificationBundle,
  ) => IFileProofVerificationResult;
  /** Log an audit entry */
  onAuditLog?: (entry: IAuditEntryParams<TID>) => Promise<void>;
  /**
   * Optional hook invoked after a file is successfully destroyed.
   * Implementations in the API layer use this to expire the associated
   * Joule storage contract and refund any remaining credit to the owner.
   *
   * @param fileId - string representation of the destroyed file's ID
   */
  onBurnbagContractDestroy?: (fileId: string) => Promise<void>;
  /**
   * Optional hook invoked when a burn date is set on a file for the first time.
   * Implementations in the API layer use this to trigger a tier downgrade
   * and refund the owner the difference in storage cost.
   *
   * @param fileId - string representation of the file whose burn date was set
   */
  onBurnbagBurnDateSet?: (fileId: string) => Promise<void>;
}

/**
 * Manages file destruction: immediate, scheduled, batch, and trash purge.
 *
 * For each file, destroys every version's vault, revokes all key wrappings,
 * records the event on the ledger, and returns a cryptographic destruction
 * proof. Delegates persistence to an `IDestructionRepository`, which is
 * implemented in `digitalburnbag-api-lib` backed by BrightDB.
 */
export class DestructionService<TID extends PlatformID>
  implements IDestructionService<TID>
{
  constructor(
    private readonly repository: IDestructionRepository<TID>,
    private readonly deps: IDestructionServiceDeps<TID>,
    private readonly generateId: () => TID,
  ) {}

  /**
   * Destroy a file immediately.
   * Destroys every version's vault, revokes all key wrappings, records the
   * event on the ledger, and returns a cryptographic destruction proof.
   */
  async destroyFile(
    fileId: TID,
    requesterId: TID,
  ): Promise<IFileDestructionProof> {
    const metadata = await this.repository.getFileMetadata(fileId);
    if (!metadata) {
      throw new FileNotFoundError(String(fileId));
    }

    const versions = await this.repository.getFileVersions(fileId);

    let lastDestructionHash: Uint8Array = new Uint8Array(0);

    for (const version of versions) {
      const { destructionHash } = await this.deps.destroyVault(
        version.vaultCreationLedgerEntryHash,
      );
      lastDestructionHash = destructionHash;

      await this.deps.revokeAllWrappings(version.id, requesterId);
    }

    const ledgerEntryHash = await this.deps.recordOnLedger({
      operation: 'file_destroyed',
      fileId: String(fileId),
      versionCount: versions.length,
      destroyedBy: String(requesterId),
    });

    const proof: IFileDestructionProof = {
      fileId: String(fileId),
      destructionHash: lastDestructionHash,
      ledgerEntryHash,
      timestamp: new Date(),
    };

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.FileDestroyed,
        actorId: requesterId,
        targetId: fileId,
        targetType: 'file',
        metadata: {
          versionCount: versions.length,
        },
      });
    }

    if (this.deps.onBurnbagContractDestroy) {
      await this.deps.onBurnbagContractDestroy(String(fileId));
    }

    return proof;
  }

  /**
   * Destroy multiple files, collecting results without throwing on
   * individual failures.
   */
  async batchDestroy(
    fileIds: TID[],
    requesterId: TID,
  ): Promise<IFileBatchDestructionResult<TID>> {
    const result: IFileBatchDestructionResult<TID> = {
      succeeded: [],
      failed: [],
    };

    for (const fileId of fileIds) {
      try {
        const proof = await this.destroyFile(fileId, requesterId);
        result.succeeded.push({ fileId, proof });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.failed.push({ fileId, error: message });
      }
    }

    return result;
  }

  /**
   * Schedule a file for future destruction.
   * Sets the scheduledDestructionAt field on the file metadata.
   */
  async scheduleDestruction(
    fileId: TID,
    scheduledAt: Date,
    requesterId: TID,
  ): Promise<void> {
    const metadata = await this.repository.getFileMetadata(fileId);
    if (!metadata) {
      throw new FileNotFoundError(String(fileId));
    }

    const isFirstBurnDate = !metadata.scheduledDestructionAt;

    await this.repository.updateFileMetadata(fileId, {
      scheduledDestructionAt: scheduledAt.toISOString(),
      updatedBy: requesterId,
      updatedAt: new Date().toISOString(),
    } as Partial<typeof metadata>);

    if (isFirstBurnDate && this.deps.onBurnbagBurnDateSet) {
      await this.deps.onBurnbagBurnDateSet(String(fileId));
    }

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.DestructionScheduled,
        actorId: requesterId,
        targetId: fileId,
        targetType: 'file',
        metadata: {
          scheduledAt: scheduledAt.toISOString(),
        },
      });
    }
  }

  /**
   * Cancel a previously scheduled destruction.
   * Clears the scheduledDestructionAt field on the file metadata.
   */
  async cancelScheduledDestruction(
    fileId: TID,
    requesterId: TID,
  ): Promise<void> {
    const metadata = await this.repository.getFileMetadata(fileId);
    if (!metadata) {
      throw new FileNotFoundError(String(fileId));
    }

    if (!metadata.scheduledDestructionAt) {
      throw new ScheduledDestructionNotFoundError(String(fileId));
    }

    await this.repository.updateFileMetadata(fileId, {
      scheduledDestructionAt: undefined,
      updatedBy: requesterId,
      updatedAt: new Date().toISOString(),
    } as Partial<typeof metadata>);

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.DestructionCancelled,
        actorId: requesterId,
        targetId: fileId,
        targetType: 'file',
        metadata: {
          cancelledAt: new Date().toISOString(),
        },
      });
    }
  }

  /**
   * Execute all destructions whose scheduled time has passed.
   * Queries files with scheduledDestructionAt before now and batch-destroys them.
   */
  async executeScheduledDestructions(): Promise<
    IFileBatchDestructionResult<TID>
  > {
    const now = new Date();
    const files = await this.repository.getFilesScheduledForDestruction(now);
    const fileIds = files.map((f) => f.id);

    const systemRequesterId = this.generateId();
    return this.batchDestroy(fileIds, systemRequesterId);
  }

  /**
   * Verify a destruction proof against a verification bundle.
   * Delegates to the injected verifyProof dependency.
   */
  verifyDestruction(
    proof: IFileDestructionProof,
    bundle: IFileVerificationBundle,
  ): IFileProofVerificationResult {
    return this.deps.verifyProof(proof, bundle);
  }

  /**
   * Purge trash items that have exceeded the retention period.
   * Queries expired trash items and batch-destroys them.
   */
  async purgeExpiredTrash(): Promise<IFileBatchDestructionResult<TID>> {
    const now = new Date();
    const expiredItems = await this.repository.getExpiredTrashItems(now);
    const fileIds = expiredItems.map((f) => f.id);

    const systemRequesterId = this.generateId();
    return this.batchDestroy(fileIds, systemRequesterId);
  }
}
