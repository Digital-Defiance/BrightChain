import { PermissionFlag } from '../enumerations/permission-flag';
import { PermissionLevel } from '../enumerations/permission-level';
import {
  IPConstraintViolationError,
  TargetNotFoundError,
  TimeWindowConstraintViolationError,
} from '../errors';
import type { IACLDocumentBase } from '../interfaces/bases/acl-document';
import type { IACLEntryBase } from '../interfaces/bases/acl-entry';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';
import type { IFolderMetadataBase } from '../interfaces/bases/folder-metadata';
import type { IPermissionSetBase } from '../interfaces/bases/permission-set';
import type { IAccessContext } from '../interfaces/params/access-context';
import type { IACLRepository } from '../interfaces/services/acl-repository';
import { ACLService, isIPInCIDR } from '../services/acl-service';

// ── In-memory repository ────────────────────────────────────────────

class InMemoryACLRepository implements IACLRepository<string> {
  public acls = new Map<string, IACLDocumentBase<string>>();
  public folders = new Map<string, IFolderMetadataBase<string>>();
  public files = new Map<string, IFileMetadataBase<string>>();
  public permissionSets = new Map<string, IPermissionSetBase<string>>();

  async getACLById(aclId: string) {
    return this.acls.get(aclId) ?? null;
  }
  async upsertACL(acl: IACLDocumentBase<string>) {
    this.acls.set(acl.id, acl);
  }
  async updateFileAclId(fileId: string, aclId: string) {
    const file = this.files.get(fileId);
    if (file) {
      file.aclId = aclId;
    }
  }
  async updateFolderAclId(folderId: string, aclId: string) {
    const folder = this.folders.get(folderId);
    if (folder) {
      folder.aclId = aclId;
    }
  }
  async getFolderById(folderId: string) {
    return this.folders.get(folderId) ?? null;
  }
  async getFileById(fileId: string) {
    return this.files.get(fileId) ?? null;
  }
  async getPermissionSetById(id: string) {
    return this.permissionSets.get(id) ?? null;
  }
  async createPermissionSet(ps: IPermissionSetBase<string>) {
    this.permissionSets.set(ps.id, ps);
  }
  async listPermissionSets(organizationId?: string) {
    return [...this.permissionSets.values()].filter(
      (ps) => !organizationId || ps.organizationId === organizationId,
    );
  }
}

// ── Helpers ──────────────────────────────────────────────────────────

function makeEntry(
  overrides: Partial<IACLEntryBase<string>> = {},
): IACLEntryBase<string> {
  return {
    principalType: 'user',
    principalId: 'user-1',
    permissionLevel: 'viewer',
    canReshare: false,
    blockDownload: false,
    ...overrides,
  };
}

function makeACL(
  id: string,
  entries: IACLEntryBase<string>[],
): IACLDocumentBase<string> {
  return {
    id,
    entries,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    updatedBy: 'admin',
  };
}

function makeFolder(
  id: string,
  ownerId: string,
  parentFolderId?: string,
  aclId?: string,
): IFolderMetadataBase<string> {
  return {
    id,
    ownerId,
    vaultContainerId: 'vc-1',
    parentFolderId,
    name: `folder-${id}`,
    aclId,
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
  aclId?: string,
): IFileMetadataBase<string> {
  return {
    id,
    ownerId,
    vaultContainerId: 'vc-1',
    folderId,
    fileName: `file-${id}`,
    mimeType: 'text/plain',
    sizeBytes: 100,
    tags: [],
    currentVersionId: `ver-${id}`,
    vaultCreationLedgerEntryHash: new Uint8Array(64),
    aclId,
    approvalGoverned: false,
    visibleWatermark: false,
    invisibleWatermark: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    createdBy: ownerId,
    updatedBy: ownerId,
  };
}

function defaultContext(
  overrides: Partial<IAccessContext> = {},
): IAccessContext {
  return {
    ipAddress: '192.168.1.10',
    timestamp: new Date('2025-06-15T12:00:00Z'),
    ...overrides,
  };
}

// ── Tests ────────────────────────────────────────────────────────────

describe('ACLService', () => {
  let repo: InMemoryACLRepository;
  let service: ACLService<string>;

  beforeEach(() => {
    repo = new InMemoryACLRepository();
    service = new ACLService(repo);
  });

  describe('getEffectivePermission', () => {
    it('returns empty flags when no ACL exists', async () => {
      const folder = makeFolder('f1', 'owner');
      repo.folders.set(folder.id, folder);

      const result = await service.getEffectivePermission(
        'f1',
        'folder',
        'user-1',
        defaultContext(),
      );
      expect(result.flags).toEqual([]);
    });

    it('resolves Viewer level to Read + Preview + Download flags', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'viewer' }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      const result = await service.getEffectivePermission(
        'f1',
        'folder',
        'user-1',
        defaultContext(),
      );
      expect(result.flags).toContain(PermissionFlag.Read);
      expect(result.flags).toContain(PermissionFlag.Preview);
      expect(result.flags).toContain(PermissionFlag.Download);
      expect(result.flags).not.toContain(PermissionFlag.Write);
      expect(result.source).toBe('explicit');
    });

    it('resolves Owner level to all flags', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'owner' }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      const result = await service.getEffectivePermission(
        'f1',
        'folder',
        'user-1',
        defaultContext(),
      );
      const allFlags = Object.values(PermissionFlag);
      for (const flag of allFlags) {
        expect(result.flags).toContain(flag);
      }
    });

    it('resolves Editor level flags correctly', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'editor' }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      const result = await service.getEffectivePermission(
        'f1',
        'folder',
        'user-1',
        defaultContext(),
      );
      expect(result.flags).toContain(PermissionFlag.Read);
      expect(result.flags).toContain(PermissionFlag.Write);
      expect(result.flags).toContain(PermissionFlag.ManageVersions);
      expect(result.flags).not.toContain(PermissionFlag.Admin);
    });

    it('resolves custom permission set flags', async () => {
      const ps: IPermissionSetBase<string> = {
        id: 'ps-1',
        name: 'Reviewer',
        flags: [PermissionFlag.Read, PermissionFlag.Comment],
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      repo.permissionSets.set(ps.id, ps);

      const acl = makeACL('acl-1', [
        makeEntry({
          principalId: 'user-1',
          permissionLevel: 'custom',
          customPermissionSetId: 'ps-1',
        }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      const result = await service.getEffectivePermission(
        'f1',
        'folder',
        'user-1',
        defaultContext(),
      );
      expect(result.flags).toEqual([
        PermissionFlag.Read,
        PermissionFlag.Comment,
      ]);
    });

    it('returns empty flags for expired entry', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({
          principalId: 'user-1',
          permissionLevel: 'editor',
          expiresAt: '2025-01-01T00:00:00Z',
        }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      const result = await service.getEffectivePermission(
        'f1',
        'folder',
        'user-1',
        defaultContext({ timestamp: new Date('2025-06-15T12:00:00Z') }),
      );
      expect(result.flags).toEqual([]);
    });

    it('throws TargetNotFoundError for nonexistent file', async () => {
      await expect(
        service.getEffectivePermission(
          'nonexistent',
          'file',
          'user-1',
          defaultContext(),
        ),
      ).rejects.toThrow(TargetNotFoundError);
    });

    it('throws TargetNotFoundError for nonexistent folder', async () => {
      await expect(
        service.getEffectivePermission(
          'nonexistent',
          'folder',
          'user-1',
          defaultContext(),
        ),
      ).rejects.toThrow(TargetNotFoundError);
    });
  });

  describe('ACL inheritance', () => {
    it('inherits ACL from parent folder when file has no explicit ACL', async () => {
      const acl = makeACL('acl-parent', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'editor' }),
      ]);
      repo.acls.set(acl.id, acl);

      const root = makeFolder('root', 'owner', undefined, 'acl-parent');
      repo.folders.set(root.id, root);

      const file = makeFile('file-1', 'owner', 'root');
      repo.files.set(file.id, file);

      const result = await service.getEffectivePermission(
        'file-1',
        'file',
        'user-1',
        defaultContext(),
      );
      expect(result.flags).toContain(PermissionFlag.Write);
      expect(result.source).toBe('inherited');
      expect(result.sourceId).toBe('root');
    });

    it('walks up multiple levels to find inherited ACL', async () => {
      const acl = makeACL('acl-root', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'viewer' }),
      ]);
      repo.acls.set(acl.id, acl);

      const root = makeFolder('root', 'owner', undefined, 'acl-root');
      const child = makeFolder('child', 'owner', 'root');
      const grandchild = makeFolder('grandchild', 'owner', 'child');
      repo.folders.set(root.id, root);
      repo.folders.set(child.id, child);
      repo.folders.set(grandchild.id, grandchild);

      const result = await service.getEffectivePermission(
        'grandchild',
        'folder',
        'user-1',
        defaultContext(),
      );
      expect(result.flags).toContain(PermissionFlag.Read);
      expect(result.source).toBe('inherited');
      expect(result.sourceId).toBe('root');
    });

    it('explicit ACL on file overrides inherited ACL', async () => {
      const parentACL = makeACL('acl-parent', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'owner' }),
      ]);
      const fileACL = makeACL('acl-file', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'viewer' }),
      ]);
      repo.acls.set(parentACL.id, parentACL);
      repo.acls.set(fileACL.id, fileACL);

      const root = makeFolder('root', 'owner', undefined, 'acl-parent');
      repo.folders.set(root.id, root);

      const file = makeFile('file-1', 'owner', 'root', 'acl-file');
      repo.files.set(file.id, file);

      const result = await service.getEffectivePermission(
        'file-1',
        'file',
        'user-1',
        defaultContext(),
      );
      // Should have Viewer flags, NOT Owner flags
      expect(result.flags).toContain(PermissionFlag.Read);
      expect(result.flags).not.toContain(PermissionFlag.Admin);
      expect(result.source).toBe('explicit');
    });

    it('explicit ACL on subfolder overrides parent ACL', async () => {
      const parentACL = makeACL('acl-parent', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'owner' }),
      ]);
      const childACL = makeACL('acl-child', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'viewer' }),
      ]);
      repo.acls.set(parentACL.id, parentACL);
      repo.acls.set(childACL.id, childACL);

      const root = makeFolder('root', 'owner', undefined, 'acl-parent');
      const child = makeFolder('child', 'owner', 'root', 'acl-child');
      repo.folders.set(root.id, root);
      repo.folders.set(child.id, child);

      const result = await service.getEffectivePermission(
        'child',
        'folder',
        'user-1',
        defaultContext(),
      );
      expect(result.flags).toContain(PermissionFlag.Read);
      expect(result.flags).not.toContain(PermissionFlag.Admin);
      expect(result.source).toBe('explicit');
    });
  });

  describe('IP range constraint', () => {
    it('allows access from IP within CIDR range', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({
          principalId: 'user-1',
          permissionLevel: 'editor',
          ipRange: '192.168.1.0/24',
        }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      const result = await service.getEffectivePermission(
        'f1',
        'folder',
        'user-1',
        defaultContext({ ipAddress: '192.168.1.50' }),
      );
      expect(result.flags).toContain(PermissionFlag.Write);
    });

    it('throws IPConstraintViolationError for IP outside range', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({
          principalId: 'user-1',
          permissionLevel: 'editor',
          ipRange: '10.0.0.0/8',
        }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      await expect(
        service.getEffectivePermission(
          'f1',
          'folder',
          'user-1',
          defaultContext({ ipAddress: '192.168.1.10' }),
        ),
      ).rejects.toThrow(IPConstraintViolationError);
    });
  });

  describe('time window constraint', () => {
    it('allows access within time window', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({
          principalId: 'user-1',
          permissionLevel: 'editor',
          timeWindowStart: '09:00',
          timeWindowEnd: '17:00',
          timeWindowTimezone: 'UTC',
        }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      const result = await service.getEffectivePermission(
        'f1',
        'folder',
        'user-1',
        defaultContext({ timestamp: new Date('2025-06-15T12:00:00Z') }),
      );
      expect(result.flags).toContain(PermissionFlag.Write);
    });

    it('throws TimeWindowConstraintViolationError outside window', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({
          principalId: 'user-1',
          permissionLevel: 'editor',
          timeWindowStart: '09:00',
          timeWindowEnd: '17:00',
          timeWindowTimezone: 'UTC',
        }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      await expect(
        service.getEffectivePermission(
          'f1',
          'folder',
          'user-1',
          defaultContext({ timestamp: new Date('2025-06-15T22:00:00Z') }),
        ),
      ).rejects.toThrow(TimeWindowConstraintViolationError);
    });

    it('handles overnight time windows correctly', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({
          principalId: 'user-1',
          permissionLevel: 'editor',
          timeWindowStart: '22:00',
          timeWindowEnd: '06:00',
          timeWindowTimezone: 'UTC',
        }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      // 23:00 UTC should be within 22:00–06:00
      const result = await service.getEffectivePermission(
        'f1',
        'folder',
        'user-1',
        defaultContext({ timestamp: new Date('2025-06-15T23:00:00Z') }),
      );
      expect(result.flags).toContain(PermissionFlag.Write);

      // 12:00 UTC should be outside 22:00–06:00
      await expect(
        service.getEffectivePermission(
          'f1',
          'folder',
          'user-1',
          defaultContext({ timestamp: new Date('2025-06-15T12:00:00Z') }),
        ),
      ).rejects.toThrow(TimeWindowConstraintViolationError);
    });
  });

  describe('checkPermissionFlag', () => {
    it('returns true when principal has the required flag', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'editor' }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      const result = await service.checkPermissionFlag(
        'f1',
        'folder',
        'user-1',
        PermissionFlag.Write,
        defaultContext(),
      );
      expect(result).toBe(true);
    });

    it('returns false when principal lacks the required flag', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'viewer' }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      const result = await service.checkPermissionFlag(
        'f1',
        'folder',
        'user-1',
        PermissionFlag.Write,
        defaultContext(),
      );
      expect(result).toBe(false);
    });
  });

  describe('checkPermission', () => {
    it('returns true when principal has all flags for the level', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'editor' }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      const result = await service.checkPermission(
        'f1',
        'folder',
        'user-1',
        PermissionLevel.Editor,
        defaultContext(),
      );
      expect(result).toBe(true);
    });

    it('returns false when principal has insufficient level', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'viewer' }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      const result = await service.checkPermission(
        'f1',
        'folder',
        'user-1',
        PermissionLevel.Editor,
        defaultContext(),
      );
      expect(result).toBe(false);
    });

    it('Owner level passes check for any required level', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'owner' }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      for (const level of Object.values(PermissionLevel)) {
        const result = await service.checkPermission(
          'f1',
          'folder',
          'user-1',
          level,
          defaultContext(),
        );
        expect(result).toBe(true);
      }
    });
  });

  describe('setACL', () => {
    it('stores ACL and updates file aclId reference', async () => {
      const file = makeFile('file-1', 'owner', 'root');
      repo.files.set(file.id, file);
      const root = makeFolder('root', 'owner');
      repo.folders.set(root.id, root);

      const acl = makeACL('acl-new', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'editor' }),
      ]);

      await service.setACL('file-1', 'file', acl, 'admin');

      expect(repo.acls.get('acl-new')).toBeDefined();
      expect(repo.files.get('file-1')?.aclId).toBe('acl-new');
    });

    it('stores ACL and updates folder aclId reference', async () => {
      const folder = makeFolder('f1', 'owner');
      repo.folders.set(folder.id, folder);

      const acl = makeACL('acl-folder', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'viewer' }),
      ]);

      await service.setACL('f1', 'folder', acl, 'admin');

      expect(repo.acls.get('acl-folder')).toBeDefined();
      expect(repo.folders.get('f1')?.aclId).toBe('acl-folder');
    });

    it('throws TargetNotFoundError for nonexistent file', async () => {
      const acl = makeACL('acl-1', []);
      await expect(
        service.setACL('nonexistent', 'file', acl, 'admin'),
      ).rejects.toThrow(TargetNotFoundError);
    });

    it('throws TargetNotFoundError for nonexistent folder', async () => {
      const acl = makeACL('acl-1', []);
      await expect(
        service.setACL('nonexistent', 'folder', acl, 'admin'),
      ).rejects.toThrow(TargetNotFoundError);
    });

    it('calls audit callback when provided', async () => {
      const auditLog: unknown[] = [];
      const auditService = new ACLService(repo, async (entry) => {
        auditLog.push(entry);
      });

      const folder = makeFolder('f1', 'owner');
      repo.folders.set(folder.id, folder);

      const acl = makeACL('acl-audit', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'viewer' }),
      ]);

      await auditService.setACL('f1', 'folder', acl, 'admin');

      expect(auditLog).toHaveLength(1);
      expect(auditLog[0]).toMatchObject({
        operationType: 'acl_changed',
        actorId: 'admin',
        targetId: 'f1',
        targetType: 'folder',
      });
    });

    it('makes the new ACL effective for permission checks', async () => {
      const folder = makeFolder('f1', 'owner');
      repo.folders.set(folder.id, folder);

      // Initially no ACL — should have no flags
      const before = await service.getEffectivePermission(
        'f1',
        'folder',
        'user-1',
        defaultContext(),
      );
      expect(before.flags).toEqual([]);

      // Set an ACL granting editor
      const acl = makeACL('acl-new', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'editor' }),
      ]);
      await service.setACL('f1', 'folder', acl, 'admin');

      // Now should have editor flags
      const after = await service.getEffectivePermission(
        'f1',
        'folder',
        'user-1',
        defaultContext(),
      );
      expect(after.flags).toContain(PermissionFlag.Write);
      expect(after.source).toBe('explicit');
    });
  });

  describe('getACL', () => {
    it('returns explicit ACL for a folder', async () => {
      const acl = makeACL('acl-1', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'editor' }),
      ]);
      repo.acls.set(acl.id, acl);
      const folder = makeFolder('f1', 'owner', undefined, 'acl-1');
      repo.folders.set(folder.id, folder);

      const result = await service.getACL('f1', 'folder');
      expect(result).not.toBeNull();
      expect(result!.acl.id).toBe('acl-1');
      expect(result!.inherited).toBe(false);
    });

    it('returns inherited ACL when file has no explicit ACL', async () => {
      const acl = makeACL('acl-parent', [
        makeEntry({ principalId: 'user-1', permissionLevel: 'viewer' }),
      ]);
      repo.acls.set(acl.id, acl);

      const root = makeFolder('root', 'owner', undefined, 'acl-parent');
      repo.folders.set(root.id, root);

      const file = makeFile('file-1', 'owner', 'root');
      repo.files.set(file.id, file);

      const result = await service.getACL('file-1', 'file');
      expect(result).not.toBeNull();
      expect(result!.acl.id).toBe('acl-parent');
      expect(result!.inherited).toBe(true);
      expect(result!.inheritedFromFolderId).toBe('root');
    });

    it('returns null when no ACL exists in hierarchy', async () => {
      const folder = makeFolder('f1', 'owner');
      repo.folders.set(folder.id, folder);

      const result = await service.getACL('f1', 'folder');
      expect(result).toBeNull();
    });

    it('throws TargetNotFoundError for nonexistent target', async () => {
      await expect(service.getACL('nonexistent', 'file')).rejects.toThrow(
        TargetNotFoundError,
      );
    });
  });

  describe('createPermissionSet', () => {
    it('creates a custom permission set and stores it', async () => {
      const ps = await service.createPermissionSet(
        {
          name: 'Reviewer',
          flags: [PermissionFlag.Read, PermissionFlag.Comment],
        },
        'admin',
      );

      expect(ps.name).toBe('Reviewer');
      expect(ps.flags).toEqual([PermissionFlag.Read, PermissionFlag.Comment]);
      expect(ps.createdBy).toBe('admin');
      expect(repo.permissionSets.get(ps.id)).toBeDefined();
    });

    it('creates a permission set with organizationId', async () => {
      const ps = await service.createPermissionSet(
        {
          name: 'Contributor',
          flags: [
            PermissionFlag.Read,
            PermissionFlag.Write,
            PermissionFlag.Preview,
          ],
          organizationId: 'org-1',
        },
        'admin',
      );

      expect(ps.organizationId).toBe('org-1');
    });

    it('calls audit callback when provided', async () => {
      const auditLog: unknown[] = [];
      const auditService = new ACLService(repo, async (entry) => {
        auditLog.push(entry);
      });

      await auditService.createPermissionSet(
        {
          name: 'Custom',
          flags: [PermissionFlag.Read],
        },
        'admin',
      );

      expect(auditLog).toHaveLength(1);
      expect(auditLog[0]).toMatchObject({
        operationType: 'acl_changed',
        actorId: 'admin',
      });
    });
  });

  describe('listPermissionSets', () => {
    it('returns all permission sets when no organizationId', async () => {
      const ps1: IPermissionSetBase<string> = {
        id: 'ps-1',
        name: 'Set1',
        flags: [PermissionFlag.Read],
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ps2: IPermissionSetBase<string> = {
        id: 'ps-2',
        name: 'Set2',
        flags: [PermissionFlag.Write],
        organizationId: 'org-1',
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      repo.permissionSets.set(ps1.id, ps1);
      repo.permissionSets.set(ps2.id, ps2);

      const result = await service.listPermissionSets();
      expect(result).toHaveLength(2);
    });

    it('filters by organizationId', async () => {
      const ps1: IPermissionSetBase<string> = {
        id: 'ps-1',
        name: 'Set1',
        flags: [PermissionFlag.Read],
        organizationId: 'org-1',
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const ps2: IPermissionSetBase<string> = {
        id: 'ps-2',
        name: 'Set2',
        flags: [PermissionFlag.Write],
        organizationId: 'org-2',
        createdBy: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      repo.permissionSets.set(ps1.id, ps1);
      repo.permissionSets.set(ps2.id, ps2);

      const result = await service.listPermissionSets('org-1');
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Set1');
    });

    it('returns empty array when no sets exist', async () => {
      const result = await service.listPermissionSets();
      expect(result).toEqual([]);
    });
  });
});

describe('isIPInCIDR', () => {
  it('matches IP within /24 range', () => {
    expect(isIPInCIDR('192.168.1.100', '192.168.1.0/24')).toBe(true);
  });

  it('rejects IP outside /24 range', () => {
    expect(isIPInCIDR('192.168.2.1', '192.168.1.0/24')).toBe(false);
  });

  it('matches IP within /8 range', () => {
    expect(isIPInCIDR('10.255.255.255', '10.0.0.0/8')).toBe(true);
  });

  it('rejects IP outside /8 range', () => {
    expect(isIPInCIDR('11.0.0.1', '10.0.0.0/8')).toBe(false);
  });

  it('matches exact IP with /32', () => {
    expect(isIPInCIDR('1.2.3.4', '1.2.3.4/32')).toBe(true);
    expect(isIPInCIDR('1.2.3.5', '1.2.3.4/32')).toBe(false);
  });

  it('matches any IP with /0', () => {
    expect(isIPInCIDR('255.255.255.255', '0.0.0.0/0')).toBe(true);
  });

  it('handles plain IP without mask as /32', () => {
    expect(isIPInCIDR('1.2.3.4', '1.2.3.4')).toBe(true);
    expect(isIPInCIDR('1.2.3.5', '1.2.3.4')).toBe(false);
  });

  it('returns false for invalid IP', () => {
    expect(isIPInCIDR('not-an-ip', '10.0.0.0/8')).toBe(false);
  });
});
