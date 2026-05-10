/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for BrightDBFileRepository — Task 22.2
 */
import { BrightDBFileRepository } from '../../collections/file-collection';
import { createMockCollection } from './mock-collection';
import { mockIds } from './mock-ids';

describe('BrightDBFileRepository', () => {
  const createRepo = () => {
    const fileMetadata = createMockCollection();
    const fileVersions = createMockCollection();
    const repo = new BrightDBFileRepository(
      fileMetadata as any,
      fileVersions as any,
      mockIds,
    );
    return { repo, fileMetadata, fileVersions };
  };

  describe('getFileById', () => {
    it('should return file when found', async () => {
      const { repo, fileMetadata } = createRepo();
      fileMetadata.findOne.mockResolvedValueOnce({
        _id: 'file-1',
        fileName: 'test.txt',
        mimeType: 'text/plain',
      });

      const result = await repo.getFileById('file-1' as any);
      expect(result).toEqual({
        id: 'file-1',
        fileName: 'test.txt',
        mimeType: 'text/plain',
      });
    });

    it('should return null when not found', async () => {
      const { repo, fileMetadata } = createRepo();
      fileMetadata.findOne.mockResolvedValueOnce(null);

      const result = await repo.getFileById('nonexistent' as any);
      expect(result).toBeNull();
    });
  });

  describe('createFile', () => {
    it('should insert and return the metadata', async () => {
      const { repo, fileMetadata } = createRepo();
      const metadata = {
        id: 'file-1',
        fileName: 'doc.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
      } as any;

      const result = await repo.createFile(metadata);
      expect(fileMetadata.insertOne).toHaveBeenCalled();
      expect(result).toEqual(metadata);
    });
  });

  describe('updateFile', () => {
    it('should call updateOne with $set', async () => {
      const { repo, fileMetadata } = createRepo();
      const metadata = {
        id: 'file-1',
        fileName: 'renamed.pdf',
        mimeType: 'application/pdf',
      } as any;

      await repo.updateFile(metadata);
      expect(fileMetadata.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'file-1' }),
        { $set: expect.objectContaining({ fileName: 'renamed.pdf' }) },
      );
    });
  });

  describe('deleteFile', () => {
    it('should call deleteOne with file id', async () => {
      const { repo, fileMetadata } = createRepo();
      await repo.deleteFile('file-1' as any);
      expect(fileMetadata.deleteOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'file-1' }),
      );
    });
  });

  describe('getFilesByFolder', () => {
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
          {
            _id: 'f2',
            fileName: 'b.txt',
            folderId: 'folder-1',
            deletedAt: null,
          },
        ],
      });

      const results = await repo.getFilesByFolder('folder-1' as any);
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('id', 'f1');
      expect(results[1]).toHaveProperty('id', 'f2');
    });
  });

  describe('searchFiles', () => {
    it('should filter by query, tags, and accessible file ids', async () => {
      const { repo, fileMetadata } = createRepo();
      fileMetadata.find.mockReturnValueOnce({
        toArray: async () => [
          { _id: 'f1', fileName: 'report.pdf', tags: ['finance'] },
        ],
      });

      const result = await repo.searchFiles(
        { query: 'report', tags: ['finance'] } as any,
        ['f1', 'f2'] as any[],
      );
      expect(result.results).toHaveLength(1);
      expect(result.totalCount).toBe(1);
      expect(fileMetadata.find).toHaveBeenCalled();
    });
  });

  describe('getDeletedFiles', () => {
    it('should return files with non-null deletedAt', async () => {
      const { repo, fileMetadata } = createRepo();
      fileMetadata.find.mockReturnValueOnce({
        toArray: async () => [
          { _id: 'f1', fileName: 'old.txt', deletedAt: '2025-01-01' },
        ],
      });

      const results = await repo.getDeletedFiles();
      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('id', 'f1');
    });
  });

  describe('file versions', () => {
    it('should create and retrieve versions sorted by versionNumber', async () => {
      const { repo, fileVersions } = createRepo();
      fileVersions.find.mockReturnValueOnce({
        toArray: async () => [
          { _id: 'v2', fileId: 'f1', versionNumber: 2 },
          { _id: 'v1', fileId: 'f1', versionNumber: 1 },
        ],
      });

      const versions = await repo.getFileVersions('f1' as any);
      expect(versions).toHaveLength(2);
      expect(versions[0]).toHaveProperty('id', 'v1');
      expect(versions[1]).toHaveProperty('id', 'v2');
    });

    it('should get a specific version by fileId and versionId', async () => {
      const { repo, fileVersions } = createRepo();
      fileVersions.findOne.mockResolvedValueOnce({
        _id: 'v1',
        fileId: 'f1',
        versionNumber: 1,
      });

      const version = await repo.getFileVersion('f1' as any, 'v1' as any);
      expect(version).toHaveProperty('id', 'v1');
    });

    it('should return null for nonexistent version', async () => {
      const { repo, fileVersions } = createRepo();
      fileVersions.findOne.mockResolvedValueOnce(null);

      const version = await repo.getFileVersion('f1' as any, 'v99' as any);
      expect(version).toBeNull();
    });

    it('should create a file version', async () => {
      const { repo, fileVersions } = createRepo();
      const version = { id: 'v1', fileId: 'f1', versionNumber: 1 } as any;

      const result = await repo.createFileVersion(version);
      expect(fileVersions.insertOne).toHaveBeenCalled();
      expect(result).toEqual(version);
    });

    it('should update a file version', async () => {
      const { repo, fileVersions } = createRepo();
      const version = { id: 'v1', fileId: 'f1', versionNumber: 2 } as any;

      await repo.updateFileVersion(version);
      expect(fileVersions.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'v1' }),
        { $set: expect.objectContaining({ versionNumber: 2 }) },
      );
    });
  });
});
