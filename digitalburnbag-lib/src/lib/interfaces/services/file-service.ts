import { PlatformID } from '@digitaldefiance/ecies-lib';
import type { IFileMetadataBase } from '../bases/file-metadata';
import type { IFileVersionBase } from '../bases/file-version';
import type { IAccessContext } from '../params/access-context';
import type {
  ICreateFileParams,
  IFileMetadataUpdate,
  IFileSearchQuery,
  ISearchResults,
} from '../params/file-service-params';
import type {
  IAccessStatusCheck,
  IEncryptedFileContent,
  IFileReadOptions,
} from '../params/vault-container-params';

/**
 * Service interface for file CRUD, versioning, search, trash, and non-access proofs.
 *
 * Validates: Requirements 2.1, 2.2, 2.3, 2.4, 4.1, 4.2, 4.3, 4.4, 6.1, 6.2, 7.1, 7.2, 25.1
 */
export interface IFileService<TID extends PlatformID> {
  /** Create file metadata (called by UploadService.finalize) */
  createFile(params: ICreateFileParams<TID>): Promise<IFileMetadataBase<TID>>;

  /**
   * Download file content — ACL check (Viewer+), vault destroyed check.
   * If the vault is sealed and options.confirmSealBreak is not true,
   * throws SealBreakNotConfirmedError so the UI can warn the user.
   */
  getFileContent(
    fileId: TID,
    requesterId: TID,
    context: IAccessContext,
    options?: IFileReadOptions,
  ): Promise<ReadableStream<Uint8Array>>;

  /**
   * Return encrypted file content and the requester's ECIES-wrapped symmetric key
   * for client-side E2EE decryption. No plaintext is sent to the client.
   */
  getEncryptedFileContent(
    fileId: TID,
    requesterId: TID,
    context: IAccessContext,
  ): Promise<IEncryptedFileContent>;

  /**
   * Check a file's access status before reading.
   * Returns whether the vault is sealed (requiring seal-break confirmation).
   */
  checkAccessStatus(
    fileId: TID,
    requesterId: TID,
  ): Promise<IAccessStatusCheck<TID>>;

  /** Get file metadata — ACL check */
  getFileMetadata(
    fileId: TID,
    requesterId: TID,
  ): Promise<IFileMetadataBase<TID>>;

  /** Update file metadata — ACL check (Editor+), audit log */
  updateFileMetadata(
    fileId: TID,
    updates: Partial<IFileMetadataUpdate<TID>>,
    requesterId: TID,
  ): Promise<IFileMetadataBase<TID>>;

  /** Soft-delete a file to trash */
  softDelete(fileId: TID, requesterId: TID): Promise<void>;

  /** Restore a file from trash */
  restoreFromTrash(fileId: TID, requesterId: TID): Promise<void>;

  /** Search files with ACL filtering */
  search(
    query: IFileSearchQuery<TID>,
    requesterId: TID,
  ): Promise<ISearchResults<TID>>;

  /** Get version history for a file */
  getVersionHistory(
    fileId: TID,
    requesterId: TID,
  ): Promise<IFileVersionBase<TID>[]>;

  /** Restore a specific version as current */
  restoreVersion(
    fileId: TID,
    versionId: TID,
    requesterId: TID,
  ): Promise<IFileMetadataBase<TID>>;

  /** Get non-access proof for a file */
  getNonAccessProof(fileId: TID, requesterId: TID): Promise<unknown>;
}
