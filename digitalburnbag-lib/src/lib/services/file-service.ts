import { PlatformID } from '@digitaldefiance/ecies-lib';
import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import { PermissionFlag } from '../enumerations/permission-flag';
import {
  FileNotFoundError,
  FileVersionNotFoundError,
  PermissionDeniedError,
  VaultDestroyedError,
} from '../errors';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';
import type { IFileVersionBase } from '../interfaces/bases/file-version';
import type { IAccessContext } from '../interfaces/params/access-context';
import type { IAuditEntryParams } from '../interfaces/params/audit-service-params';
import type {
  ICreateFileParams,
  IFileMetadataUpdate,
  IFileSearchQuery,
  ISearchResults,
} from '../interfaces/params/file-service-params';
import type {
  IAccessStatusCheck,
  IEncryptedFileContent,
} from '../interfaces/params/vault-container-params';
import type { IFileRepository } from '../interfaces/services/file-repository';
import type { IFileService } from '../interfaces/services/file-service';
/**
 * Dependencies injected into FileService that come from other services.
 */
export interface IFileServiceDeps<TID extends PlatformID> {
  /** Check a single atomic permission flag on a target */
  checkPermissionFlag: (
    targetId: TID,
    targetType: 'file' | 'folder',
    principalId: TID,
    requiredFlag: PermissionFlag,
    context: IAccessContext,
  ) => Promise<boolean>;
  /** Read vault to get symmetric key and recipe for decryption */
  readVault: (
    vaultCreationLedgerEntryHash: Uint8Array,
  ) => Promise<{ symmetricKey: Uint8Array; recipe: unknown }>;
  /** Reconstruct file from block store and decrypt */
  reconstructAndDecrypt: (
    recipe: unknown,
    symmetricKey: Uint8Array,
  ) => Promise<ReadableStream<Uint8Array>>;
  /**
   * Read vault and return raw encrypted bytes for E2EE download.
   * Returns ciphertext, IV, and auth tag WITHOUT decrypting.
   */
  readVaultEncrypted?: (
    vaultCreationLedgerEntryHash: Uint8Array,
  ) => Promise<{
    encryptedContent: Uint8Array;
    iv: Uint8Array;
    authTag: Uint8Array;
  }>;
  /**
   * Get the ECIES-wrapped symmetric key stored for a specific requester.
   * Returns null when no wrapping entry exists for this requester.
   */
  getWrappedKey?: (
    fileVersionId: TID,
    requesterId: TID,
  ) => Promise<Uint8Array | null>;
  /** Log an audit entry */
  onAuditLog?: (entry: IAuditEntryParams<TID>) => Promise<void>;
  /** Verify non-access proof via LedgerVerifier */
  verifyNonAccess?: (
    vaultCreationLedgerEntryHash: Uint8Array,
  ) => Promise<unknown>;
}

/**
 * Manages file CRUD, versioning, search, trash, and non-access proofs.
 *
 * Delegates persistence to an `IFileRepository`, which is implemented in
 * `digitalburnbag-api-lib` backed by BrightDB. Vault access and block
 * reconstruction are injected as dependencies so the service stays
 * environment-agnostic.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 6.2
 */
export class FileService<TID extends PlatformID> implements IFileService<TID> {
  constructor(
    private readonly repository: IFileRepository<TID>,
    private readonly deps: IFileServiceDeps<TID>,
    private readonly generateId: () => TID,
  ) {}

  /**
   * Create file metadata after upload finalization.
   * Stores File_Metadata in BrightDB and creates the initial file version.
   *
   * Validates: Requirement 2.1
   */
  async createFile(
    params: ICreateFileParams<TID>,
  ): Promise<IFileMetadataBase<TID>> {
    const now = new Date().toISOString();
    const fileId = this.generateId();
    const versionId = this.generateId();

    const metadata: IFileMetadataBase<TID> = {
      id: fileId,
      ownerId: params.ownerId,
      vaultContainerId: params.vaultContainerId,
      folderId: params.folderId,
      fileName: params.fileName,
      mimeType: params.mimeType,
      sizeBytes: params.sizeBytes,
      description: params.description,
      tags: params.tags ?? [],
      currentVersionId: versionId,
      vaultCreationLedgerEntryHash: params.encryptionKey,
      approvalGoverned: false,
      visibleWatermark: false,
      invisibleWatermark: false,
      createdAt: now,
      updatedAt: now,
      createdBy: params.ownerId,
      updatedBy: params.ownerId,
    };

    const storedMetadata = await this.repository.createFile(metadata);

    // Create the initial file version
    const version: IFileVersionBase<TID> = {
      id: versionId,
      fileId,
      versionNumber: 1,
      sizeBytes: params.sizeBytes,
      vaultCreationLedgerEntryHash: params.encryptionKey,
      vaultState: 'sealed',
      uploaderId: params.ownerId,
      createdAt: now,
    };
    await this.repository.createFileVersion(version);

    // Log file creation to audit service
    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.FileUploaded,
        actorId: params.ownerId,
        targetId: fileId,
        targetType: 'file',
        metadata: {
          fileName: params.fileName,
          mimeType: params.mimeType,
          sizeBytes: params.sizeBytes,
          folderId: String(params.folderId),
        },
      });
    }

    return storedMetadata;
  }

  /**
   * Download file content.
   * Performs ACL check (Viewer+ / Read flag), checks vault state,
   * reads vault for key + recipe, reconstructs from block store, and decrypts.
   *
   * Validates: Requirements 2.2, 2.4, 6.2
   */
  async getFileContent(
    fileId: TID,
    requesterId: TID,
    context: IAccessContext,
  ): Promise<ReadableStream<Uint8Array>> {
    const file = await this.getExistingFile(fileId);

    // ACL check: require Read flag (Viewer+)
    const hasPermission = await this.deps.checkPermissionFlag(
      fileId,
      'file',
      requesterId,
      PermissionFlag.Read,
      context,
    );
    if (!hasPermission) {
      throw new PermissionDeniedError(
        `User does not have Read permission on file ${String(fileId)}`,
      );
    }

    // Check vault state on the current version
    const version = await this.repository.getFileVersion(
      fileId,
      file.currentVersionId,
    );
    if (version && version.vaultState === 'destroyed') {
      throw new VaultDestroyedError();
    }

    // Read vault for symmetric key and recipe
    const { symmetricKey, recipe } = await this.deps.readVault(
      file.vaultCreationLedgerEntryHash,
    );

    // Reconstruct from block store and decrypt
    const stream = await this.deps.reconstructAndDecrypt(recipe, symmetricKey);

    // Log download to audit service
    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.FileDownloaded,
        actorId: requesterId,
        targetId: fileId,
        targetType: 'file',
        ipAddress: context.ipAddress,
      });
    }

    return stream;
  }

  /**
   * Return encrypted file content + requester's ECIES-wrapped key for E2EE download.
   * Performs the same ACL and vault-state checks as getFileContent, but
   * returns ciphertext bytes without decrypting them server-side.
   *
   * Throws PermissionDeniedError if the requester lacks Read permission.
   * Throws VaultDestroyedError if the vault has been destroyed.
   */
  async getEncryptedFileContent(
    fileId: TID,
    requesterId: TID,
    context: IAccessContext,
  ): Promise<IEncryptedFileContent> {
    const file = await this.getExistingFile(fileId);

    const hasPermission = await this.deps.checkPermissionFlag(
      fileId,
      'file',
      requesterId,
      PermissionFlag.Read,
      context,
    );
    if (!hasPermission) {
      throw new PermissionDeniedError(
        `User does not have Read permission on file ${String(fileId)}`,
      );
    }

    const version = await this.repository.getFileVersion(
      fileId,
      file.currentVersionId,
    );
    if (version && version.vaultState === 'destroyed') {
      throw new VaultDestroyedError();
    }

    if (!this.deps.readVaultEncrypted || !this.deps.getWrappedKey) {
      throw new Error(
        'E2EE download requires readVaultEncrypted and getWrappedKey deps',
      );
    }

    const { encryptedContent, iv, authTag } =
      await this.deps.readVaultEncrypted(file.vaultCreationLedgerEntryHash);

    const encryptedSymmetricKey = await this.deps.getWrappedKey(
      file.currentVersionId,
      requesterId,
    );
    if (!encryptedSymmetricKey) {
      throw new PermissionDeniedError(
        `No key wrapping entry found for requester ${String(requesterId)}`,
      );
    }

    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.FileDownloaded,
        actorId: requesterId,
        targetId: fileId,
        targetType: 'file',
        ipAddress: context.ipAddress,
      });
    }

    return { encryptedContent, iv, authTag, encryptedSymmetricKey };
  }

  /**
   * Check a file's access status before reading.
   * Returns whether the vault is sealed (requiring seal-break confirmation)
   * so the UI can warn the user before irreversibly breaking the seal.
   */
  async checkAccessStatus(
    fileId: TID,
    requesterId: TID,
  ): Promise<IAccessStatusCheck<TID>> {
    const file = await this.getExistingFile(fileId);

    // ACL check: require Read flag (Viewer+)
    const hasPermission = await this.deps.checkPermissionFlag(
      fileId,
      'file',
      requesterId,
      PermissionFlag.Read,
      { ipAddress: '0.0.0.0', timestamp: new Date() },
    );
    if (!hasPermission) {
      throw new PermissionDeniedError(
        `User does not have Read permission on file ${String(fileId)}`,
      );
    }

    const version = await this.repository.getFileVersion(
      fileId,
      file.currentVersionId,
    );
    const vaultState = version?.vaultState ?? 'sealed';
    const requiresConfirmation = vaultState === 'sealed';

    return {
      fileId,
      vaultState,
      requiresSealBreakConfirmation: requiresConfirmation,
      warningMessage: requiresConfirmation
        ? 'This file has never been accessed. Reading it will permanently break ' +
          'the cryptographic seal. Non-access can no longer be proven for this ' +
          'file or its vault container.'
        : undefined,
    };
  }

  /**
   * Get file metadata with ACL check.
   *
   * Validates: Requirement 2.3
   */
  async getFileMetadata(
    fileId: TID,
    requesterId: TID,
  ): Promise<IFileMetadataBase<TID>> {
    const file = await this.getExistingFile(fileId);

    // ACL check: require Read flag (Viewer+)
    // Use a minimal context for metadata-only access
    const hasPermission = await this.deps.checkPermissionFlag(
      fileId,
      'file',
      requesterId,
      PermissionFlag.Read,
      { ipAddress: '0.0.0.0', timestamp: new Date() },
    );
    if (!hasPermission) {
      throw new PermissionDeniedError(
        `User does not have Read permission on file ${String(fileId)}`,
      );
    }

    return file;
  }

  /**
   * Update file metadata (name, tags, parent folder, description).
   * Requires Editor+ (Write flag). Logs changes to AuditService.
   *
   * Validates: Requirement 2.3
   */
  async updateFileMetadata(
    fileId: TID,
    updates: Partial<IFileMetadataUpdate<TID>>,
    requesterId: TID,
  ): Promise<IFileMetadataBase<TID>> {
    const file = await this.getExistingFile(fileId);

    // ACL check: require Write flag (Editor+)
    const hasPermission = await this.deps.checkPermissionFlag(
      fileId,
      'file',
      requesterId,
      PermissionFlag.Write,
      { ipAddress: '0.0.0.0', timestamp: new Date() },
    );
    if (!hasPermission) {
      throw new PermissionDeniedError(
        `User does not have Write permission on file ${String(fileId)}`,
      );
    }

    const now = new Date().toISOString();
    const changedFields: Record<string, unknown> = {};

    if (updates.fileName !== undefined) {
      changedFields['fileName'] = { from: file.fileName, to: updates.fileName };
      file.fileName = updates.fileName;
    }
    if (updates.tags !== undefined) {
      changedFields['tags'] = { from: file.tags, to: updates.tags };
      file.tags = updates.tags;
    }
    if (updates.folderId !== undefined) {
      changedFields['folderId'] = {
        from: String(file.folderId),
        to: String(updates.folderId),
      };
      file.folderId = updates.folderId;
    }
    if (updates.description !== undefined) {
      changedFields['description'] = {
        from: file.description,
        to: updates.description,
      };
      file.description = updates.description;
    }

    file.updatedAt = now;
    file.updatedBy = requesterId;

    const updatedFile = await this.repository.updateFile(file);

    // Determine audit operation type
    const operationType =
      updates.fileName !== undefined
        ? FileAuditOperationType.FileRenamed
        : updates.folderId !== undefined
          ? FileAuditOperationType.FileMoved
          : FileAuditOperationType.FileRenamed; // generic metadata update

    // Log update to audit service
    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType,
        actorId: requesterId,
        targetId: fileId,
        targetType: 'file',
        metadata: changedFields,
      });
    }

    return updatedFile;
  }

  // --- Stub implementations for tasks 8.2–8.5 ---

  /**
   * Soft-delete a file to trash.
   * Sets deletedAt timestamp and stores original folder path for restore.
   *
   * Validates: Requirements 7.1, 7.2, 7.3
   */
  async softDelete(fileId: TID, requesterId: TID): Promise<void> {
    const file = await this.getExistingFile(fileId);

    // ACL check: require Delete flag
    const hasPermission = await this.deps.checkPermissionFlag(
      fileId,
      'file',
      requesterId,
      PermissionFlag.Delete,
      { ipAddress: '0.0.0.0', timestamp: new Date() },
    );
    if (!hasPermission) {
      throw new PermissionDeniedError(
        `User does not have Delete permission on file ${String(fileId)}`,
      );
    }

    const now = new Date().toISOString();
    file.deletedAt = now;
    file.deletedFromPath = String(file.folderId);
    file.updatedAt = now;
    file.updatedBy = requesterId;

    await this.repository.updateFile(file);

    // Log deletion to audit service
    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.FileDeleted,
        actorId: requesterId,
        targetId: fileId,
        targetType: 'file',
        metadata: {
          deletedFromPath: file.deletedFromPath,
        },
      });
    }
  }

  /**
   * Restore a file from trash.
   * Clears deletedAt and deletedFromPath, keeping the current folderId.
   *
   * Validates: Requirements 7.1, 7.2, 7.3
   */
  async restoreFromTrash(fileId: TID, requesterId: TID): Promise<void> {
    const file = await this.getExistingFile(fileId);

    // ACL check: require Delete flag (same permission needed for restore)
    const hasPermission = await this.deps.checkPermissionFlag(
      fileId,
      'file',
      requesterId,
      PermissionFlag.Delete,
      { ipAddress: '0.0.0.0', timestamp: new Date() },
    );
    if (!hasPermission) {
      throw new PermissionDeniedError(
        `User does not have Delete permission on file ${String(fileId)}`,
      );
    }

    // File must be in trash
    if (!file.deletedAt) {
      throw new Error(`File ${String(fileId)} is not in trash`);
    }

    const now = new Date().toISOString();
    file.deletedAt = undefined;
    file.deletedFromPath = undefined;
    file.updatedAt = now;
    file.updatedBy = requesterId;

    await this.repository.updateFile(file);

    // Log restore to audit service
    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.FileRestored,
        actorId: requesterId,
        targetId: fileId,
        targetType: 'file',
      });
    }
  }

  /**
   * Search files with query filters.
   * Delegates to repository — ACL filtering will be wired in integration phase.
   *
   * Validates: Requirements 6.1, 6.2, 6.3, 6.4, 47.4
   */
  async search(
    query: IFileSearchQuery<TID>,
    _requesterId: TID,
  ): Promise<ISearchResults<TID>> {
    // Delegate to repository — ACL filtering will be wired in integration phase
    const { results, totalCount } = await this.repository.searchFiles(
      query,
      [],
    );
    return {
      results,
      totalCount,
      page: 1,
      pageSize: 50,
    };
  }

  async getVersionHistory(
    _fileId: TID,
    _requesterId: TID,
  ): Promise<IFileVersionBase<TID>[]> {
    const _file = await this.getExistingFile(_fileId);

    // ACL check: require Read flag (Viewer+)
    const hasPermission = await this.deps.checkPermissionFlag(
      _fileId,
      'file',
      _requesterId,
      PermissionFlag.Read,
      { ipAddress: '0.0.0.0', timestamp: new Date() },
    );
    if (!hasPermission) {
      throw new PermissionDeniedError(
        `User does not have Read permission on file ${String(_fileId)}`,
      );
    }

    const versions = await this.repository.getFileVersions(_fileId);

    // Sort by versionNumber ascending
    versions.sort((a, b) => a.versionNumber - b.versionNumber);

    return versions;
  }

  async restoreVersion(
    _fileId: TID,
    _versionId: TID,
    _requesterId: TID,
  ): Promise<IFileMetadataBase<TID>> {
    const file = await this.getExistingFile(_fileId);

    // ACL check: require ManageVersions flag
    const hasPermission = await this.deps.checkPermissionFlag(
      _fileId,
      'file',
      _requesterId,
      PermissionFlag.ManageVersions,
      { ipAddress: '0.0.0.0', timestamp: new Date() },
    );
    if (!hasPermission) {
      throw new PermissionDeniedError(
        `User does not have ManageVersions permission on file ${String(_fileId)}`,
      );
    }

    // Get the target version
    const version = await this.repository.getFileVersion(_fileId, _versionId);
    if (!version) {
      throw new FileVersionNotFoundError(String(_fileId), String(_versionId));
    }

    // Check if the version's vault has been destroyed
    if (version.vaultState === 'destroyed') {
      throw new VaultDestroyedError();
    }

    // Update file metadata to point to the restored version
    const now = new Date().toISOString();
    file.currentVersionId = _versionId;
    file.vaultCreationLedgerEntryHash = version.vaultCreationLedgerEntryHash;
    file.updatedAt = now;
    file.updatedBy = _requesterId;

    const updatedFile = await this.repository.updateFile(file);

    // Log version restore to audit service
    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.FileVersionRestored,
        actorId: _requesterId,
        targetId: _fileId,
        targetType: 'file',
        metadata: {
          restoredVersionId: String(_versionId),
          versionNumber: version.versionNumber,
        },
      });
    }

    return updatedFile;
  }

  /**
   * Get non-access proof for a file.
   * Delegates to LedgerVerifier via injected dependency.
   *
   * Validates: Requirements 25.1, 25.2, 25.3
   */
  async getNonAccessProof(fileId: TID, requesterId: TID): Promise<unknown> {
    const file = await this.getExistingFile(fileId);

    // ACL check: require Read flag (Viewer+)
    const hasPermission = await this.deps.checkPermissionFlag(
      fileId,
      'file',
      requesterId,
      PermissionFlag.Read,
      { ipAddress: '0.0.0.0', timestamp: new Date() },
    );
    if (!hasPermission) {
      throw new PermissionDeniedError(
        `User does not have Read permission on file ${String(fileId)}`,
      );
    }

    if (!this.deps.verifyNonAccess) {
      throw new Error('Non-access proof verification not configured');
    }

    const result = await this.deps.verifyNonAccess(
      file.vaultCreationLedgerEntryHash,
    );

    // Log non-access proof generation to audit service
    if (this.deps.onAuditLog) {
      await this.deps.onAuditLog({
        operationType: FileAuditOperationType.NonAccessProofGenerated,
        actorId: requesterId,
        targetId: fileId,
        targetType: 'file',
      });
    }

    return result;
  }

  /**
   * Retrieve a file by ID, throwing FileNotFoundError if it does not exist.
   */
  private async getExistingFile(fileId: TID): Promise<IFileMetadataBase<TID>> {
    const file = await this.repository.getFileById(fileId);
    if (!file) {
      throw new FileNotFoundError(String(fileId));
    }
    return file;
  }
}
