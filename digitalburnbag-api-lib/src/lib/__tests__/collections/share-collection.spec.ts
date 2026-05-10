/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for BrightDBShareRepository — Task 22.2
 */
import { BrightDBShareRepository } from '../../collections/share-collection';
import { createMockCollection } from './mock-collection';
import { mockIds } from './mock-ids';

describe('BrightDBShareRepository', () => {
  const createRepo = () => {
    const shareLinks = createMockCollection();
    const aclDocuments = createMockCollection();
    const files = createMockCollection();
    const folders = createMockCollection();
    const repo = new BrightDBShareRepository(
      shareLinks as any,
      aclDocuments as any,
      files as any,
      folders as any,
      mockIds,
    );
    return { repo, shareLinks, aclDocuments, files, folders };
  };

  describe('createShareLink', () => {
    it('should insert and return the share link', async () => {
      const { repo, shareLinks } = createRepo();
      const link = {
        id: 'link-1',
        token: 'abc123',
        fileId: 'file-1',
        scope: 'anonymous',
      } as any;

      const result = await repo.createShareLink(link);
      expect(shareLinks.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'link-1', token: 'abc123' }),
      );
      expect(result).toEqual(link);
    });
  });

  describe('getShareLinkById', () => {
    it('should return link when found', async () => {
      const { repo, shareLinks } = createRepo();
      shareLinks.findOne.mockResolvedValueOnce({
        _id: 'link-1',
        token: 'abc123',
      });

      const result = await repo.getShareLinkById('link-1' as any);
      expect(result).toEqual({ id: 'link-1', token: 'abc123' });
    });

    it('should return null when not found', async () => {
      const { repo, shareLinks } = createRepo();
      shareLinks.findOne.mockResolvedValueOnce(null);

      const result = await repo.getShareLinkById('nonexistent' as any);
      expect(result).toBeNull();
    });
  });

  describe('getShareLinkByToken', () => {
    it('should find link by token string', async () => {
      const { repo, shareLinks } = createRepo();
      shareLinks.findOne.mockResolvedValueOnce({
        _id: 'link-1',
        token: 'abc123',
      });

      const result = await repo.getShareLinkByToken('abc123');
      expect(result).toHaveProperty('id', 'link-1');
      expect(shareLinks.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ token: 'abc123' }),
      );
    });
  });

  describe('updateShareLink', () => {
    it('should update link fields', async () => {
      const { repo, shareLinks } = createRepo();
      await repo.updateShareLink({
        id: 'link-1',
        token: 'abc123',
        accessCount: 5,
      } as any);

      expect(shareLinks.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'link-1' }),
        { $set: expect.objectContaining({ accessCount: 5 }) },
      );
    });
  });

  describe('deleteShareLink', () => {
    it('should delete by id', async () => {
      const { repo, shareLinks } = createRepo();
      await repo.deleteShareLink('link-1' as any);
      expect(shareLinks.deleteOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'link-1' }),
      );
    });
  });

  describe('getShareLinksForFile', () => {
    it('should return all links for a file', async () => {
      const { repo, shareLinks } = createRepo();
      shareLinks.find.mockReturnValueOnce({
        toArray: async () => [
          { _id: 'link-1', fileId: 'file-1', token: 'a' },
          { _id: 'link-2', fileId: 'file-1', token: 'b' },
        ],
      });

      const results = await repo.getShareLinksForFile('file-1' as any);
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('id', 'link-1');
    });
  });

  describe('getSharedItems', () => {
    it('should return files and folders shared with user via ACL entries', async () => {
      const { repo, aclDocuments, files, folders } = createRepo();

      aclDocuments.find.mockReturnValueOnce({
        toArray: async () => [
          {
            _id: 'acl-1',
            entries: [
              {
                principalType: 'user',
                principalId: 'user-2',
                permissionLevel: 'Viewer',
              },
            ],
            updatedAt: '2025-01-01',
          },
        ],
      });

      files.find.mockReturnValueOnce({
        toArray: async () => [
          { _id: 'file-1', ownerId: 'user-1', aclId: 'acl-1' },
        ],
      });

      folders.find.mockReturnValueOnce({
        toArray: async () => [],
      });

      const items = await repo.getSharedItems('user-2' as any);
      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({
        itemId: 'file-1',
        itemType: 'file',
        sharedBy: 'user-1',
      });
    });

    it('should return empty array when nothing shared', async () => {
      const { repo, aclDocuments } = createRepo();
      aclDocuments.find.mockReturnValueOnce({ toArray: async () => [] });

      const items = await repo.getSharedItems('user-lonely' as any);
      expect(items).toEqual([]);
    });
  });
});
