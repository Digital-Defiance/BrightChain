/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Unit tests for BrightDBACLRepository — Task 22.2
 */
import { BrightDBACLRepository } from '../../collections/acl-collection';
import { createMockCollection } from './mock-collection';
import { mockIds } from './mock-ids';

describe('BrightDBACLRepository', () => {
  const createRepo = () => {
    const aclDocuments = createMockCollection();
    const files = createMockCollection();
    const folders = createMockCollection();
    const permissionSets = createMockCollection();
    const repo = new BrightDBACLRepository(
      aclDocuments as any,
      files as any,
      folders as any,
      permissionSets as any,
      mockIds,
    );
    return { repo, aclDocuments, files, folders, permissionSets };
  };

  describe('getACLById', () => {
    it('should return ACL document when found', async () => {
      const { repo, aclDocuments } = createRepo();
      aclDocuments.findOne.mockResolvedValueOnce({
        _id: 'acl-1',
        entries: [{ principalId: 'user-1', principalType: 'user' }],
      });

      const result = await repo.getACLById('acl-1' as any);
      expect(result).toEqual({
        id: 'acl-1',
        entries: [{ principalId: 'user-1', principalType: 'user' }],
      });
    });

    it('should return null when not found', async () => {
      const { repo, aclDocuments } = createRepo();
      aclDocuments.findOne.mockResolvedValueOnce(null);

      const result = await repo.getACLById('nonexistent' as any);
      expect(result).toBeNull();
    });
  });

  describe('upsertACL', () => {
    it('should update existing ACL', async () => {
      const { repo, aclDocuments } = createRepo();
      aclDocuments.updateOne.mockResolvedValueOnce({ matchedCount: 1 });

      await repo.upsertACL({
        id: 'acl-1',
        entries: [],
        updatedAt: new Date(),
      } as any);

      expect(aclDocuments.updateOne).toHaveBeenCalled();
      expect(aclDocuments.insertOne).not.toHaveBeenCalled();
    });

    it('should insert new ACL when not found', async () => {
      const { repo, aclDocuments } = createRepo();
      aclDocuments.updateOne.mockResolvedValueOnce({ matchedCount: 0 });

      await repo.upsertACL({
        id: 'acl-new',
        entries: [],
        updatedAt: new Date(),
      } as any);

      expect(aclDocuments.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'acl-new' }),
      );
    });
  });

  describe('updateFileAclId', () => {
    it('should set aclId on file', async () => {
      const { repo, files } = createRepo();
      await repo.updateFileAclId('file-1' as any, 'acl-1' as any);
      expect(files.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'file-1' }),
        { $set: { aclId: 'acl-1' } },
      );
    });
  });

  describe('updateFolderAclId', () => {
    it('should set aclId on folder', async () => {
      const { repo, folders } = createRepo();
      await repo.updateFolderAclId('folder-1' as any, 'acl-1' as any);
      expect(folders.updateOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'folder-1' }),
        { $set: { aclId: 'acl-1' } },
      );
    });
  });

  describe('getFolderById / getFileById', () => {
    it('should return folder from folders collection', async () => {
      const { repo, folders } = createRepo();
      folders.findOne.mockResolvedValueOnce({ _id: 'f1', name: 'Docs' });

      const result = await repo.getFolderById('f1' as any);
      expect(result).toEqual({ id: 'f1', name: 'Docs' });
    });

    it('should return file from files collection', async () => {
      const { repo, files } = createRepo();
      files.findOne.mockResolvedValueOnce({ _id: 'file-1', fileName: 'a.txt' });

      const result = await repo.getFileById('file-1' as any);
      expect(result).toEqual({ id: 'file-1', fileName: 'a.txt' });
    });
  });

  describe('permission sets', () => {
    it('should create a permission set', async () => {
      const { repo, permissionSets } = createRepo();
      await repo.createPermissionSet({
        id: 'ps-1',
        name: 'Custom',
        flags: ['Read', 'Write'],
      } as any);

      expect(permissionSets.insertOne).toHaveBeenCalledWith(
        expect.objectContaining({ _id: 'ps-1', name: 'Custom' }),
      );
    });

    it('should get permission set by id', async () => {
      const { repo, permissionSets } = createRepo();
      permissionSets.findOne.mockResolvedValueOnce({
        _id: 'ps-1',
        name: 'Custom',
        flags: ['Read'],
      });

      const result = await repo.getPermissionSetById('ps-1' as any);
      expect(result).toEqual({ id: 'ps-1', name: 'Custom', flags: ['Read'] });
    });

    it('should list permission sets, optionally filtered by org', async () => {
      const { repo, permissionSets } = createRepo();
      permissionSets.find.mockReturnValueOnce({
        toArray: async () => [
          { _id: 'ps-1', name: 'Set A', organizationId: 'org-1' },
          { _id: 'ps-2', name: 'Set B', organizationId: 'org-1' },
        ],
      });

      const results = await repo.listPermissionSets('org-1' as any);
      expect(results).toHaveLength(2);
    });

    it('should list all permission sets when no org specified', async () => {
      const { repo, permissionSets } = createRepo();
      permissionSets.find.mockReturnValueOnce({
        toArray: async () => [{ _id: 'ps-1', name: 'Global' }],
      });

      const results = await repo.listPermissionSets();
      expect(results).toHaveLength(1);
      expect(permissionSets.find).toHaveBeenCalledWith(
        expect.objectContaining({}),
      );
    });
  });
});
