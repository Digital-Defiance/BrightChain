import {
  DuplicateFolderNameError,
  FolderNotFoundError,
  InvalidMoveError,
} from '../errors';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';
import type { IFolderMetadataBase } from '../interfaces/bases/folder-metadata';
import type { IFolderRepository } from '../interfaces/services/folder-repository';
import { FolderService } from '../services/folder-service';

/**
 * In-memory repository for testing FolderService.
 * Uses string as TID for simplicity.
 */
class InMemoryFolderRepository implements IFolderRepository<string> {
  public folders = new Map<string, IFolderMetadataBase<string>>();
  public files = new Map<string, IFileMetadataBase<string>>();

  async getFolderById(
    folderId: string,
  ): Promise<IFolderMetadataBase<string> | null> {
    return this.folders.get(folderId) ?? null;
  }

  async getRootFolder(
    userId: string,
    _vaultContainerId?: string,
  ): Promise<IFolderMetadataBase<string> | null> {
    for (const folder of this.folders.values()) {
      if (folder.ownerId === userId && !folder.parentFolderId) {
        return folder;
      }
    }
    return null;
  }

  async createFolder(
    folder: IFolderMetadataBase<string>,
  ): Promise<IFolderMetadataBase<string>> {
    this.folders.set(folder.id, { ...folder });
    return { ...folder };
  }

  async folderExistsInParent(
    name: string,
    parentFolderId: string,
    ownerId: string,
  ): Promise<boolean> {
    for (const folder of this.folders.values()) {
      if (
        folder.name === name &&
        folder.parentFolderId === parentFolderId &&
        folder.ownerId === ownerId
      ) {
        return true;
      }
    }
    return false;
  }

  async getSubfolders(
    folderId: string,
  ): Promise<IFolderMetadataBase<string>[]> {
    const result: IFolderMetadataBase<string>[] = [];
    for (const folder of this.folders.values()) {
      if (folder.parentFolderId === folderId) {
        result.push({ ...folder });
      }
    }
    return result;
  }

  async getFilesInFolder(
    folderId: string,
  ): Promise<IFileMetadataBase<string>[]> {
    const result: IFileMetadataBase<string>[] = [];
    for (const file of this.files.values()) {
      if (file.folderId === folderId) {
        result.push({ ...file });
      }
    }
    return result;
  }

  async updateParentFolder(
    folderId: string,
    newParentId: string,
  ): Promise<void> {
    const folder = this.folders.get(folderId);
    if (folder) {
      folder.parentFolderId = newParentId;
    }
  }

  async updateFileFolder(fileId: string, newFolderId: string): Promise<void> {
    const file = this.files.get(fileId);
    if (file) {
      file.folderId = newFolderId;
    }
  }
}

function _makeFolder(
  id: string,
  ownerId: string,
  name: string,
  parentFolderId?: string,
): IFolderMetadataBase<string> {
  return {
    id,
    ownerId,
    vaultContainerId: 'vc-1',
    parentFolderId,
    name,
    approvalGoverned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: ownerId,
    updatedBy: ownerId,
  };
}

function makeFile(
  id: string,
  ownerId: string,
  folderId: string,
  fileName: string,
): IFileMetadataBase<string> {
  return {
    id,
    ownerId,
    vaultContainerId: 'vc-1',
    folderId,
    fileName,
    mimeType: 'text/plain',
    sizeBytes: 100,
    tags: [],
    currentVersionId: `ver-${id}`,
    vaultCreationLedgerEntryHash: new Uint8Array(64),
    approvalGoverned: false,
    visibleWatermark: false,
    invisibleWatermark: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: ownerId,
    updatedBy: ownerId,
  };
}

describe('FolderService', () => {
  let repo: InMemoryFolderRepository;
  let service: FolderService<string>;
  let idCounter: number;
  const userId = 'user-1';
  const requesterId = 'user-1';
  const vaultContainerId = 'vc-1';

  beforeEach(() => {
    repo = new InMemoryFolderRepository();
    idCounter = 0;
    service = new FolderService(repo, () => `id-${++idCounter}`);
  });

  describe('getRootFolder', () => {
    it('creates root folder on first access', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      expect(root).toBeDefined();
      expect(root.name).toBe('Root');
      expect(root.ownerId).toBe(userId);
      expect(root.parentFolderId).toBeUndefined();
      expect(repo.folders.size).toBe(1);
    });

    it('returns existing root folder on subsequent access', async () => {
      const first = await service.getRootFolder(userId, vaultContainerId);
      const second = await service.getRootFolder(userId, vaultContainerId);
      expect(first.id).toBe(second.id);
      expect(repo.folders.size).toBe(1);
    });

    it('creates separate root folders for different users', async () => {
      const root1 = await service.getRootFolder('user-1', vaultContainerId);
      const root2 = await service.getRootFolder('user-2', vaultContainerId);
      expect(root1.id).not.toBe(root2.id);
      expect(root1.ownerId).toBe('user-1');
      expect(root2.ownerId).toBe('user-2');
    });
  });

  describe('createFolder', () => {
    it('creates a folder under a parent', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      const folder = await service.createFolder({
        name: 'Documents',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });
      expect(folder.name).toBe('Documents');
      expect(folder.parentFolderId).toBe(root.id);
      expect(folder.ownerId).toBe(userId);
    });

    it('rejects duplicate folder name in same parent', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      await service.createFolder({
        name: 'Documents',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });
      await expect(
        service.createFolder({
          name: 'Documents',
          parentFolderId: root.id,
          vaultContainerId,
          ownerId: userId,
        }),
      ).rejects.toThrow(DuplicateFolderNameError);
    });

    it('allows same folder name in different parents', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      const folderA = await service.createFolder({
        name: 'Sub',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });
      const folderB = await service.createFolder({
        name: 'Other',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });
      // Same name "Nested" in two different parents should succeed
      const nestedA = await service.createFolder({
        name: 'Nested',
        parentFolderId: folderA.id,
        vaultContainerId,
        ownerId: userId,
      });
      const nestedB = await service.createFolder({
        name: 'Nested',
        parentFolderId: folderB.id,
        vaultContainerId,
        ownerId: userId,
      });
      expect(nestedA.id).not.toBe(nestedB.id);
    });

    it('throws FolderNotFoundError when parent does not exist', async () => {
      await expect(
        service.createFolder({
          name: 'Orphan',
          parentFolderId: 'nonexistent',
          vaultContainerId,
          ownerId: userId,
        }),
      ).rejects.toThrow(FolderNotFoundError);
    });
  });

  describe('getFolderContents', () => {
    it('returns subfolders and files in a folder', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      await service.createFolder({
        name: 'Docs',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });
      await service.createFolder({
        name: 'Photos',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });
      const file = makeFile('file-1', userId, root.id, 'readme.txt');
      repo.files.set(file.id, file);

      const contents = await service.getFolderContents(root.id, requesterId);
      expect(contents.folders).toHaveLength(2);
      expect(contents.files).toHaveLength(1);
      expect(contents.files[0].fileName).toBe('readme.txt');
    });

    it('throws FolderNotFoundError for nonexistent folder', async () => {
      await expect(
        service.getFolderContents('nonexistent', requesterId),
      ).rejects.toThrow(FolderNotFoundError);
    });

    it('returns empty contents for empty folder', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      const contents = await service.getFolderContents(root.id, requesterId);
      expect(contents.folders).toHaveLength(0);
      expect(contents.files).toHaveLength(0);
    });

    it('sorts contents by name ascending', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      await service.createFolder({
        name: 'Zebra',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });
      await service.createFolder({
        name: 'Alpha',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });

      const contents = await service.getFolderContents(root.id, requesterId, {
        field: 'name',
        direction: 'asc',
      });
      expect(contents.folders[0].name).toBe('Alpha');
      expect(contents.folders[1].name).toBe('Zebra');
    });
  });

  describe('move', () => {
    it('moves a folder to a new parent', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      const folderA = await service.createFolder({
        name: 'A',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });
      const folderB = await service.createFolder({
        name: 'B',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });

      await service.move(folderA.id, 'folder', folderB.id, requesterId);

      const updated = repo.folders.get(folderA.id);
      expect(updated?.parentFolderId).toBe(folderB.id);
    });

    it('moves a file to a new folder', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      const target = await service.createFolder({
        name: 'Target',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });
      const file = makeFile('file-1', userId, root.id, 'doc.txt');
      repo.files.set(file.id, file);

      await service.move(file.id, 'file', target.id, requesterId);

      const updated = repo.files.get(file.id);
      expect(updated?.folderId).toBe(target.id);
    });

    it('throws FolderNotFoundError when new parent does not exist', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      const folder = await service.createFolder({
        name: 'A',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });

      await expect(
        service.move(folder.id, 'folder', 'nonexistent', requesterId),
      ).rejects.toThrow(FolderNotFoundError);
    });

    it('prevents moving a folder into itself', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      const folder = await service.createFolder({
        name: 'Self',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });

      await expect(
        service.move(folder.id, 'folder', folder.id, requesterId),
      ).rejects.toThrow(InvalidMoveError);
    });

    it('prevents moving a folder into its descendant', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      const parent = await service.createFolder({
        name: 'Parent',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });
      const child = await service.createFolder({
        name: 'Child',
        parentFolderId: parent.id,
        vaultContainerId,
        ownerId: userId,
      });
      const grandchild = await service.createFolder({
        name: 'Grandchild',
        parentFolderId: child.id,
        vaultContainerId,
        ownerId: userId,
      });

      await expect(
        service.move(parent.id, 'folder', grandchild.id, requesterId),
      ).rejects.toThrow(InvalidMoveError);
    });

    it('triggers ACL re-evaluation callback on move', async () => {
      const aclCallback = jest.fn().mockResolvedValue(undefined);
      const svcWithAcl = new FolderService(
        repo,
        () => `id-${++idCounter}`,
        aclCallback,
      );

      const root = await svcWithAcl.getRootFolder(userId, vaultContainerId);
      const target = await svcWithAcl.createFolder({
        name: 'Target',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });
      const folder = await svcWithAcl.createFolder({
        name: 'Movable',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });

      await svcWithAcl.move(folder.id, 'folder', target.id, requesterId);

      expect(aclCallback).toHaveBeenCalledWith(folder.id, 'folder');
    });
  });

  describe('getFolderPath', () => {
    it('returns breadcrumb path from root to target folder', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      const docs = await service.createFolder({
        name: 'Documents',
        parentFolderId: root.id,
        vaultContainerId,
        ownerId: userId,
      });
      const work = await service.createFolder({
        name: 'Work',
        parentFolderId: docs.id,
        vaultContainerId,
        ownerId: userId,
      });

      const path = await service.getFolderPath(work.id);
      expect(path).toHaveLength(3);
      expect(path[0].id).toBe(root.id);
      expect(path[1].id).toBe(docs.id);
      expect(path[2].id).toBe(work.id);
    });

    it('returns single-element path for root folder', async () => {
      const root = await service.getRootFolder(userId, vaultContainerId);
      const path = await service.getFolderPath(root.id);
      expect(path).toHaveLength(1);
      expect(path[0].id).toBe(root.id);
    });

    it('throws FolderNotFoundError for nonexistent folder', async () => {
      await expect(service.getFolderPath('nonexistent')).rejects.toThrow(
        FolderNotFoundError,
      );
    });
  });
});
