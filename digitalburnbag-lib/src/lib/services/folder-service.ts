import { PlatformID } from '@digitaldefiance/ecies-lib';
import {
  DuplicateFolderNameError,
  FolderNotFoundError,
  InvalidMoveError,
} from '../errors';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';
import type { IFolderMetadataBase } from '../interfaces/bases/folder-metadata';
import type {
  ICreateFolderParams,
  IFolderContents,
  ISortOptions,
} from '../interfaces/params/folder-service-params';
import type { IFolderRepository } from '../interfaces/services/folder-repository';
import type { IFolderService } from '../interfaces/services/folder-service';

/**
 * Manages folder hierarchy: creation, navigation, move, and breadcrumb paths.
 *
 * Delegates persistence to an `IFolderRepository`, which is implemented in
 * `digitalburnbag-api-lib` backed by BrightDB.
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5
 */
export class FolderService<TID extends PlatformID>
  implements IFolderService<TID>
{
  constructor(
    private readonly repository: IFolderRepository<TID>,
    private readonly generateId: () => TID,
    private readonly onAclReEvaluate?: (
      itemId: TID,
      itemType: 'file' | 'folder',
    ) => Promise<void>,
  ) {}

  /**
   * Create a new folder under the specified parent.
   * Rejects if a folder with the same name already exists in the same parent.
   *
   * Validates: Requirements 3.2, 3.5
   */
  async createFolder(
    params: ICreateFolderParams<TID>,
  ): Promise<IFolderMetadataBase<TID>> {
    const exists = await this.repository.folderExistsInParent(
      params.name,
      params.parentFolderId,
      params.ownerId,
    );
    if (exists) {
      throw new DuplicateFolderNameError(
        params.name,
        String(params.parentFolderId),
      );
    }

    // Verify parent folder exists
    const parent = await this.repository.getFolderById(params.parentFolderId);
    if (!parent) {
      throw new FolderNotFoundError(String(params.parentFolderId));
    }

    const now = new Date().toISOString();
    const folder: IFolderMetadataBase<TID> = {
      id: this.generateId(),
      ownerId: params.ownerId,
      vaultContainerId: params.vaultContainerId,
      parentFolderId: params.parentFolderId,
      name: params.name,
      approvalGoverned: false,
      createdAt: now,
      updatedAt: now,
      createdBy: params.ownerId,
      updatedBy: params.ownerId,
    };

    return this.repository.createFolder(folder);
  }

  /**
   * Get the contents of a folder: subfolders and files, optionally sorted.
   *
   * Validates: Requirement 3.4
   */
  async getFolderContents(
    folderId: TID,
    _requesterId: TID,
    sort?: ISortOptions,
  ): Promise<IFolderContents<TID>> {
    const folder = await this.repository.getFolderById(folderId);
    if (!folder) {
      throw new FolderNotFoundError(String(folderId));
    }

    const [folders, files] = await Promise.all([
      this.repository.getSubfolders(folderId),
      this.repository.getFilesInFolder(folderId),
    ]);

    if (sort) {
      this.sortFolders(folders, sort);
      this.sortFiles(files, sort);
    }

    return { folders, files };
  }

  /**
   * Move a file or folder to a new parent folder.
   * Triggers ACL re-evaluation for the moved item.
   *
   * Validates: Requirement 3.3
   */
  async move(
    itemId: TID,
    itemType: 'file' | 'folder',
    newParentId: TID,
    _requesterId: TID,
  ): Promise<void> {
    // Verify new parent exists
    const newParent = await this.repository.getFolderById(newParentId);
    if (!newParent) {
      throw new FolderNotFoundError(String(newParentId));
    }

    if (itemType === 'folder') {
      // Prevent moving a folder into itself or a descendant
      if (String(itemId) === String(newParentId)) {
        throw new InvalidMoveError('Cannot move a folder into itself');
      }
      const isDescendant = await this.isDescendantOf(newParentId, itemId);
      if (isDescendant) {
        throw new InvalidMoveError(
          'Cannot move a folder into one of its descendants',
        );
      }
      await this.repository.updateParentFolder(itemId, newParentId);
    } else {
      await this.repository.updateFileFolder(itemId, newParentId);
    }

    // Trigger ACL re-evaluation for the moved item
    if (this.onAclReEvaluate) {
      await this.onAclReEvaluate(itemId, itemType);
    }
  }

  /**
   * Get the root folder for a vault container.
   * Root folders are created by VaultContainerService.createContainer().
   *
   * Validates: Requirement 3.1
   */
  async getRootFolder(
    userId: TID,
    vaultContainerId?: TID,
  ): Promise<IFolderMetadataBase<TID>> {
    const existing = await this.repository.getRootFolder(
      userId,
      vaultContainerId,
    );
    if (existing) {
      return existing;
    }

    // Root folders should be created by VaultContainerService, but
    // fall back to creating one if needed (e.g. during container creation)
    if (!vaultContainerId) {
      throw new FolderNotFoundError(
        'No vault container specified for root folder',
      );
    }

    const now = new Date().toISOString();
    const root: IFolderMetadataBase<TID> = {
      id: this.generateId(),
      ownerId: userId,
      vaultContainerId,
      name: 'Root',
      approvalGoverned: false,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      updatedBy: userId,
    };

    return this.repository.createFolder(root);
  }

  /**
   * Get the breadcrumb path from root to the specified folder.
   * Returns an array ordered from root to the target folder.
   *
   * Validates: Requirement 3.1 (hierarchical navigation)
   */
  async getFolderPath(folderId: TID): Promise<IFolderMetadataBase<TID>[]> {
    const path: IFolderMetadataBase<TID>[] = [];
    let currentId: TID | undefined = folderId;

    while (currentId !== undefined) {
      const folder = await this.repository.getFolderById(currentId);
      if (!folder) {
        throw new FolderNotFoundError(String(currentId));
      }
      path.unshift(folder);
      currentId = folder.parentFolderId;
    }

    return path;
  }

  /**
   * Resolve a virtual path (e.g. ["my-folder", "test", "blah"]) starting from
   * the vault container's root folder. Walks the folder tree segment by segment.
   * If the final segment matches a file rather than a subfolder, it is returned
   * as `file`; otherwise `file` is null and the full folder chain is returned.
   */
  async resolvePath(
    userId: TID,
    segments: string[],
    vaultContainerId?: TID,
  ): Promise<{
    folders: IFolderMetadataBase<TID>[];
    file: IFileMetadataBase<TID> | null;
  }> {
    const root = await this.getRootFolder(userId, vaultContainerId);
    const folders: IFolderMetadataBase<TID>[] = [root];

    if (segments.length === 0) {
      return { folders, file: null };
    }

    let currentFolder = root;

    for (let i = 0; i < segments.length; i++) {
      const name = decodeURIComponent(segments[i]);
      const isLast = i === segments.length - 1;

      // Try to find a subfolder with this name
      const subfolders = await this.repository.getSubfolders(currentFolder.id);
      const matchedFolder = subfolders.find(
        (f) => f.name.toLowerCase() === name.toLowerCase(),
      );

      if (matchedFolder) {
        folders.push(matchedFolder);
        currentFolder = matchedFolder;
        continue;
      }

      // If this is the last segment, check if it's a file
      if (isLast) {
        const files = await this.repository.getFilesInFolder(currentFolder.id);
        const matchedFile = files.find(
          (f) => f.fileName.toLowerCase() === name.toLowerCase(),
        );
        if (matchedFile) {
          return { folders, file: matchedFile };
        }
      }

      // Nothing matched
      throw new FolderNotFoundError(
        `Path segment "${name}" not found in "${currentFolder.name}"`,
      );
    }

    return { folders, file: null };
  }

  /**
   * Soft-delete a folder by setting its deletedAt timestamp.
   * Records the original parent path for potential restore.
   */
  async softDeleteFolder(folderId: TID, _requesterId: TID): Promise<void> {
    const folder = await this.repository.getFolderById(folderId);
    if (!folder) {
      throw new FolderNotFoundError(String(folderId));
    }
    // Prevent deleting root folders
    if (!folder.parentFolderId) {
      throw new InvalidMoveError('Cannot delete a root folder');
    }
    const deletedFromPath = folder.parentFolderId
      ? String(folder.parentFolderId)
      : '/';
    await this.repository.softDeleteFolder(folderId, deletedFromPath);
  }

  /**
   * Check if `candidateDescendantId` is a descendant of `ancestorId`.
   * Used to prevent circular moves.
   */
  private async isDescendantOf(
    candidateDescendantId: TID,
    ancestorId: TID,
  ): Promise<boolean> {
    let currentId: TID | undefined = candidateDescendantId;

    while (currentId !== undefined) {
      const folder = await this.repository.getFolderById(currentId);
      if (!folder || !folder.parentFolderId) {
        return false;
      }
      if (String(folder.parentFolderId) === String(ancestorId)) {
        return true;
      }
      currentId = folder.parentFolderId;
    }

    return false;
  }

  /**
   * Sort folders by the specified field and direction.
   */
  private sortFolders(
    folders: IFolderMetadataBase<TID>[],
    sort: ISortOptions,
  ): void {
    folders.sort((a, b) => {
      const cmp = this.compareFolderField(a, b, sort.field);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }

  /**
   * Sort files by the specified field and direction.
   */
  private sortFiles(files: IFileMetadataBase<TID>[], sort: ISortOptions): void {
    files.sort((a, b) => {
      const cmp = this.compareFileField(a, b, sort.field);
      return sort.direction === 'asc' ? cmp : -cmp;
    });
  }

  private compareFolderField(
    a: IFolderMetadataBase<TID>,
    b: IFolderMetadataBase<TID>,
    field: ISortOptions['field'],
  ): number {
    switch (field) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'modifiedDate':
        return (
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );
      case 'size':
      case 'type':
        // Folders don't have size or type — sort by name as fallback
        return a.name.localeCompare(b.name);
    }
  }

  private compareFileField(
    a: IFileMetadataBase<TID>,
    b: IFileMetadataBase<TID>,
    field: ISortOptions['field'],
  ): number {
    switch (field) {
      case 'name':
        return a.fileName.localeCompare(b.fileName);
      case 'size':
        return a.sizeBytes - b.sizeBytes;
      case 'modifiedDate':
        return (
          new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()
        );
      case 'type':
        return a.mimeType.localeCompare(b.mimeType);
    }
  }
}
