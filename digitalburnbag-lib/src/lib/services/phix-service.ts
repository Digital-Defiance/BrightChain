import { PlatformID } from '@digitaldefiance/ecies-lib';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import { PermissionFlag } from '../enumerations/permission-flag';
import { PhixPlanType } from '../enumerations/phix-plan-type';
import {
  DuplicateFolderNameError,
  FileNotFoundError,
  FolderNotFoundError,
  PermissionDeniedError,
} from '../errors';
import type { IAuditEntryParams } from '../interfaces/params/audit-service-params';
import type {
  IPhixParams,
  IPhixPlan,
  IPhixResult,
} from '../interfaces/params/phix-service-params';
import type { IFileRepository } from '../interfaces/services/file-repository';
import type { IFolderRepository } from '../interfaces/services/folder-repository';
import type { IPhixService } from '../interfaces/services/phix-service';

/**
 * Dependencies injected into PhixService.
 */
export interface IPhixServiceDeps<TID extends PlatformID> {
  /** Check a single atomic permission flag on a target */
  checkPermissionFlag: (
    targetId: TID,
    targetType: 'file' | 'folder',
    principalId: TID,
    requiredFlag: PermissionFlag,
  ) => Promise<boolean>;
  /** Log an audit entry */
  onAuditLog?: (entry: IAuditEntryParams<TID>) => Promise<void>;
}

/** Rough estimate: ~100 MB/s throughput for full-cycle operations */
const ESTIMATED_THROUGHPUT_BYTES_PER_MS = 100_000;

/**
 * Joule cost estimates per operation type.
 *
 * BrightChain runs on joules — every operation has an energy cost.
 * These are rough estimates; the real cost depends on hardware,
 * block size, encryption algorithm, and network conditions.
 *
 * Metadata-only: ~0.003 J (a single DB write)
 * Full-cycle per GB: ~50 J (read + decrypt + re-encrypt + write + destroy)
 */
const JOULES_PER_METADATA_WRITE = 0.003;
const JOULES_PER_BYTE_FULL_CYCLE = 50 / (1024 * 1024 * 1024); // ~50 J/GB

/**
 * Phix Service — Phoenix-cycle rename operations.
 *
 * Two-phase API: plan() → execute().
 * The plan tells the UI what's about to happen (and feeds the mascot's
 * personality tier). Execute performs the actual rename.
 */
export class PhixService<TID extends PlatformID> implements IPhixService<TID> {
  constructor(
    private readonly fileRepository: IFileRepository<TID>,
    private readonly folderRepository: IFolderRepository<TID>,
    private readonly deps: IPhixServiceDeps<TID>,
  ) {}

  /**
   * Phase 1: Generate a Phix plan.
   *
   * Inspects the target, counts affected children (for folders),
   * determines plan type, and builds a summary the UI can display.
   */
  async plan(params: IPhixParams<TID>): Promise<IPhixPlan<TID>> {
    // ACL check: require Write permission
    const hasPermission = await this.deps.checkPermissionFlag(
      params.itemId,
      params.itemType,
      params.requesterId,
      PermissionFlag.Write,
    );
    if (!hasPermission) {
      throw new PermissionDeniedError(
        `User does not have Write permission on ${params.itemType} ${String(params.itemId)}`,
      );
    }

    if (params.itemType === 'file') {
      return this.planFilePhix(params);
    }
    return this.planFolderPhix(params);
  }

  /**
   * Phase 2: Execute a previously generated Phix plan.
   */
  async execute(
    plan: IPhixPlan<TID>,
    requesterId: TID,
  ): Promise<IPhixResult<TID>> {
    if (plan.itemType === 'file') {
      await this.executeFilePhix(plan, requesterId);
    } else {
      await this.executeFolderPhix(plan, requesterId);
    }

    // Audit log
    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType:
          plan.itemType === 'file'
            ? FileAuditOperationType.FilePhixed
            : FileAuditOperationType.FolderPhixed,
        actorId: requesterId,
        targetId: plan.itemId,
        targetType: plan.itemType,
        metadata: {
          oldName: plan.oldName,
          newName: plan.newName,
          planType: plan.planType,
          affectedFileCount: plan.affectedFileCount,
          affectedFolderCount: plan.affectedFolderCount,
          totalSizeBytes: plan.totalSizeBytes,
        },
      });
    }

    return {
      success: true,
      plan,
      completedAt: new Date().toISOString(),
    };
  }

  // ── Private: File ──────────────────────────────────────────────

  private async planFilePhix(
    params: IPhixParams<TID>,
  ): Promise<IPhixPlan<TID>> {
    const file = await this.fileRepository.getFileById(params.itemId);
    if (!file) {
      throw new FileNotFoundError(String(params.itemId));
    }

    // File renames are always metadata-only (name field in BrightDB)
    const planType = PhixPlanType.MetadataOnly;
    const summary = `Phixing '${file.fileName}' → '${params.newName}'. Metadata-only, instant.`;
    const { estimatedDurationMs, estimatedJoules, requiresReEncryption } =
      PhixService.estimateCost(planType, file.sizeBytes);

    return {
      itemId: params.itemId,
      itemType: 'file',
      oldName: file.fileName,
      newName: params.newName,
      planType,
      affectedFileCount: 1,
      affectedFolderCount: 0,
      totalSizeBytes: file.sizeBytes,
      summary,
      estimatedDurationMs,
      requiresReEncryption,
      estimatedJoules,
    };
  }

  private async executeFilePhix(
    plan: IPhixPlan<TID>,
    requesterId: TID,
  ): Promise<void> {
    const file = await this.fileRepository.getFileById(plan.itemId);
    if (!file) {
      throw new FileNotFoundError(String(plan.itemId));
    }

    file.fileName = plan.newName;
    file.updatedAt = new Date().toISOString();
    file.updatedBy = requesterId;
    await this.fileRepository.updateFile(file);
  }

  // ── Private: Folder ────────────────────────────────────────────

  private async planFolderPhix(
    params: IPhixParams<TID>,
  ): Promise<IPhixPlan<TID>> {
    const folder = await this.folderRepository.getFolderById(params.itemId);
    if (!folder) {
      throw new FolderNotFoundError(String(params.itemId));
    }

    // Check for duplicate name in the same parent
    if (folder.parentFolderId) {
      const exists = await this.folderRepository.folderExistsInParent(
        params.newName,
        folder.parentFolderId,
        folder.ownerId,
      );
      if (exists) {
        throw new DuplicateFolderNameError(
          params.newName,
          String(folder.parentFolderId),
        );
      }
    }

    // Count children recursively for the plan summary
    const stats = await this.countFolderContents(params.itemId);

    // Folder renames are metadata-only (just the name field)
    const planType = PhixPlanType.MetadataOnly;
    const summary = this.buildFolderSummary(
      folder.name,
      params.newName,
      stats.fileCount,
      stats.folderCount,
      stats.totalSizeBytes,
    );
    const { estimatedDurationMs, estimatedJoules, requiresReEncryption } =
      PhixService.estimateCost(planType, stats.totalSizeBytes);

    return {
      itemId: params.itemId,
      itemType: 'folder',
      oldName: folder.name,
      newName: params.newName,
      planType,
      affectedFileCount: stats.fileCount,
      affectedFolderCount: stats.folderCount,
      totalSizeBytes: stats.totalSizeBytes,
      summary,
      estimatedDurationMs,
      requiresReEncryption,
      estimatedJoules,
    };
  }

  private async executeFolderPhix(
    plan: IPhixPlan<TID>,
    _requesterId: TID,
  ): Promise<void> {
    const folder = await this.folderRepository.getFolderById(plan.itemId);
    if (!folder) {
      throw new FolderNotFoundError(String(plan.itemId));
    }

    await this.folderRepository.updateFolderName(plan.itemId, plan.newName);
  }

  // ── Private: Helpers ───────────────────────────────────────────

  /**
   * Recursively count files, subfolders, and total bytes under a folder.
   */
  private async countFolderContents(folderId: TID): Promise<{
    fileCount: number;
    folderCount: number;
    totalSizeBytes: number;
  }> {
    const files = await this.folderRepository.getFilesInFolder(folderId);
    const subfolders = await this.folderRepository.getSubfolders(folderId);

    let fileCount = files.length;
    let folderCount = subfolders.length;
    let totalSizeBytes = files.reduce((sum, f) => sum + f.sizeBytes, 0);

    for (const sub of subfolders) {
      const childStats = await this.countFolderContents(sub.id);
      fileCount += childStats.fileCount;
      folderCount += childStats.folderCount;
      totalSizeBytes += childStats.totalSizeBytes;
    }

    return { fileCount, folderCount, totalSizeBytes };
  }

  /**
   * Build a human-readable summary for the Phix plan.
   * This is what the mascot reads to the user.
   */
  private buildFolderSummary(
    oldName: string,
    newName: string,
    fileCount: number,
    folderCount: number,
    totalSizeBytes: number,
  ): string {
    const size = PhixService.formatBytes(totalSizeBytes);
    const parts: string[] = [`Phixing '${oldName}' → '${newName}'.`];

    if (fileCount === 0 && folderCount === 0) {
      parts.push('Empty folder. Metadata-only, instant.');
    } else {
      const items: string[] = [];
      if (fileCount > 0)
        items.push(`${fileCount} file${fileCount !== 1 ? 's' : ''}`);
      if (folderCount > 0)
        items.push(`${folderCount} subfolder${folderCount !== 1 ? 's' : ''}`);
      parts.push(`${items.join(', ')} (${size}).`);
      parts.push('Metadata-only, instant.');
    }

    return parts.join(' ');
  }

  /**
   * Format bytes into a human-readable string.
   */
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    const value = bytes / Math.pow(1024, i);
    return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
  }

  /**
   * Estimate duration, joule cost, and re-encryption need for a plan type.
   */
  static estimateCost(
    planType: PhixPlanType,
    totalSizeBytes: number,
  ): {
    estimatedDurationMs: number;
    estimatedJoules: number;
    requiresReEncryption: boolean;
  } {
    if (planType === PhixPlanType.MetadataOnly) {
      return {
        estimatedDurationMs: 0,
        estimatedJoules: JOULES_PER_METADATA_WRITE,
        requiresReEncryption: false,
      };
    }
    return {
      estimatedDurationMs: Math.ceil(
        totalSizeBytes / ESTIMATED_THROUGHPUT_BYTES_PER_MS,
      ),
      estimatedJoules: totalSizeBytes * JOULES_PER_BYTE_FULL_CYCLE,
      requiresReEncryption: true,
    };
  }
}
