/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for BrightDBFolderRepository — Task 22.2
 */
import { BrightDBFolderRepository } from '../../collections/folder-collection';
import { createMockCollection } from './mock-collection';
import { mockIds } from './mock-ids';

describe('BrightDBFolderRepository', () => {
  const createRepo = () => {
    const folders = createMockCollection();
    const fileMetadata = createMockCollection();
    const repo = new BrightDBFolderRepository(
      folders as any,
      fileMetadata as any,
      mockIds,
    );
    return { repo, folders, fileMetadata };
  };

  describe('getFolderById', () => {
    it('should return folder when found', async () => {
      const { repo, folders } = createRepo();
      folders.findOne.mockResolvedValueOnce({
        _id: 'folder-1',
        name: 'Documents',
        ownerId: 'user-1',
      });

      const result = await repo.getFolderById('folder-1' as any);
      expect(result).toEqual({
        id: 'folder-1',
        name: 'Documents',
        ownerId: 'user-1',
      });
    });

    it('should return null when not found', async () => {
      const { repo, folders } = createRepo();
      folders.findOne.mockResolvedValueOnce(null);

      const result = await repo.getFolderById('nonexistent' as any);
      expect(result).toBeNull();
    });
  });

  describe('getRootFolder', () => {
    it('should find root folder by ownerId and null parentFolderId', async () => {
      const { repo, folders } = createRepo();
      folders.findOne.mockResolvedValueOnce({
        _id: 'root-1',
        name: 'Root',
        ownerId: 'user-1',
        parentFolderId: null,
      });

      const result = await repo.getRootFolder('user-1' as any);
      expect(result).toHaveProperty('id', 'root-1');
      expect(folders.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ ownerId: 'user-1', parentFolderId: null }),
      );
    });
  });

  describe('createFolder', () => {
    it('should insert folder and return it', async () => {
      const { repo, folders } = createRepo();
      const folder = {
        id: 'folder-1',
        name: 'New Folder',
        ownerId: 'user-1',
        parentFolderId: 'root',
      } as any;

      const result = await repo.createFolder(folder);
      expect(folders.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'folder-1', name: 'New Folder' }),
      );
      expect(result).toEqual(folder);
    });
  });

  describe('folderExistsInParent', () => {
    it('should return true when duplicate name exists', async () => {
      const { repo, folders } = createRepo();
      folders.countDocuments.mockResolvedValueOnce(1);

      const exists = await repo.folderExistsInParent(
        'Documents',
        'parent-1' as any,
        'user-1' as any,
      );
      expect(exists).toBe(true);
    });

    it('should return false when no duplicate', async () => {
      const { repo, folders } = createRepo();
      folders.countDocuments.mockResolvedValueOnce(0);

      const exists = await repo.folderExistsInParent(
        'Unique',
        'parent-1' as any,
        'user-1' as any,
      );
      expect(exists).toBe(false);
    });
  });

  describe('getSubfolders', () => {
    it('should return non-deleted subfolders', async () => {
      const { repo, folders } = createRepo();
      folders.find.mockReturnValueOnce({
        toArray: async () => [
          {
            _id: 'sub-1',
            name: 'Sub A',
            parentFolderId: 'folder-1',
            deletedAt: null,
          },
          {
            _id: 'sub-2',
            name: 'Sub B',
            parentFolderId: 'folder-1',
            deletedAt: null,
          },
        ],
      });

      const results = await repo.getSubfolders('folder-1' as any);
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('id', 'sub-1');
    });
  });

  describe('getFilesInFolder', () => {
    it('should return non-deleted files in folder', async () => {
      const { repo, fileMetadata } = createRepo();
      fileMetadata.find.mockReturnValueOnce({
        toArray: async () => [
          {
            _id: 'f1',
            fileName: 'a.txt',
            folderId: 'folder-1',
            deletedAt: null,
          },
        ],
      });

      const results = await repo.getFilesInFolder('folder-1' as any);
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('id', 'f1');
    });
  });

  describe('updateParentFolder', () => {
    it('should update folder parentFolderId', async () => {
      const { repo, folders } = createRepo();
      await repo.updateParentFolder('folder-1' as any, 'new-parent' as any);
      expect(folders.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'folder-1' }),
        { $set: { parentFolderId: 'new-parent' } },
      );
    });
  });

  describe('updateFileFolder', () => {
    it('should update file folderId', async () => {
      const { repo, fileMetadata } = createRepo();
      await repo.updateFileFolder('file-1' as any, 'new-folder' as any);
      expect(fileMetadata.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'file-1' }),
        { $set: { folderId: 'new-folder' } },
      );
    });
  });
});
