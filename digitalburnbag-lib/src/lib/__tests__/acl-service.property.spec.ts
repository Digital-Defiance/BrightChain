import * as fc from 'fast-check';
import { PermissionFlag } from '../enumerations/permission-flag';
import {
  PermissionLevel,
  PermissionLevelFlags,
} from '../enumerations/permission-level';
import { IPConstraintViolationError } from '../errors';
import type { IACLDocumentBase } from '../interfaces/bases/acl-document';
import type { IACLEntryBase } from '../interfaces/bases/acl-entry';
import type { IFileMetadataBase } from '../interfaces/bases/file-metadata';
import type { IFolderMetadataBase } from '../interfaces/bases/folder-metadata';
import type { IPermissionSetBase } from '../interfaces/bases/permission-set';
import type { IAccessContext } from '../interfaces/params/access-context';
import type { IACLRepository } from '../interfaces/services/acl-repository';
import { ACLService } from '../services/acl-service';

// ── In-memory repository (same pattern as acl-service.spec.ts) ──────

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
    if (file) file.aclId = aclId;
  }
  async updateFolderAclId(folderId: string, aclId: string) {
    const folder = this.folders.get(folderId);
    if (folder) folder.aclId = aclId;
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

// ── Arbitraries ─────────────────────────────────────────────────────

/** Generate a random target type: 'file' or 'folder' */
const arbTargetType = fc.constantFrom<'file' | 'folder'>('file', 'folder');

/** Generate a random permission level */
const arbPermissionLevel = fc.constantFrom(
  PermissionLevel.Viewer,
  PermissionLevel.Commenter,
  PermissionLevel.Editor,
  PermissionLevel.Owner,
);

/** Generate a valid IPv4 octet (0-255) */
const arbOctet = fc.integer({ min: 0, max: 255 });

/** Generate a valid IPv4 address string */
const arbIPv4 = fc
  .tuple(arbOctet, arbOctet, arbOctet, arbOctet)
  .map(([a, b, c, d]) => `${a}.${b}.${c}.${d}`);

/** Generate a CIDR range with a mask between 8 and 30 */
const arbCIDR = fc
  .tuple(arbIPv4, fc.integer({ min: 8, max: 30 }))
  .map(([ip, mask]) => `${ip}/${mask}`);

/**
 * Given a CIDR range, generate an IP that is guaranteed to be OUTSIDE the range.
 * We flip a bit in the network portion of the base IP to ensure it's in a different subnet.
 */
function arbIPOutsideCIDR(cidr: string): fc.Arbitrary<string> {
  const [rangeIP, maskStr] = cidr.split('/');
  const mask = parseInt(maskStr, 10);
  const parts = rangeIP.split('.').map((p) => parseInt(p, 10));
  const rangeNum =
    ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;

  // Pick a bit position within the network portion to flip
  return fc.integer({ min: 0, max: mask - 1 }).map((bitPos) => {
    const flipped = (rangeNum ^ (1 << (31 - bitPos))) >>> 0;
    return [
      (flipped >>> 24) & 0xff,
      (flipped >>> 16) & 0xff,
      (flipped >>> 8) & 0xff,
      flipped & 0xff,
    ].join('.');
  });
}

// ── Property Tests ──────────────────────────────────────────────────

describe('ACLService Property Tests', () => {
  /**
   * Property 4: Owner has all flags
   * For any file/folder, a principal with Owner level always has all PermissionFlag values.
   *
   * **Validates: Requirements 10.5, 40.4**
   */
  describe('Property 4: Owner has all flags', () => {
    it('a principal with Owner level always has every PermissionFlag', async () => {
      const allFlags = Object.values(PermissionFlag);

      await fc.assert(
        fc.asyncProperty(
          arbTargetType,
          fc.uuid(),
          fc.uuid(),
          fc.uuid(),
          async (targetType, targetId, principalId, aclId) => {
            const repo = new InMemoryACLRepository();
            const service = new ACLService(repo);

            const acl = makeACL(aclId, [
              makeEntry({
                principalId,
                permissionLevel: PermissionLevel.Owner,
              }),
            ]);
            repo.acls.set(acl.id, acl);

            if (targetType === 'file') {
              const folder = makeFolder('parent-folder', 'owner-user');
              repo.folders.set(folder.id, folder);
              const file = makeFile(
                targetId,
                'owner-user',
                'parent-folder',
                aclId,
              );
              repo.files.set(file.id, file);
            } else {
              const folder = makeFolder(
                targetId,
                'owner-user',
                undefined,
                aclId,
              );
              repo.folders.set(folder.id, folder);
            }

            const result = await service.getEffectivePermission(
              targetId,
              targetType,
              principalId,
              defaultContext(),
            );

            for (const flag of allFlags) {
              expect(result.flags).toContain(flag);
            }
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 5: Permission level hierarchy
   * Viewer flags ⊂ Commenter flags ⊂ Editor flags ⊂ Owner flags
   *
   * **Validates: Requirements 35.4, 40.4**
   */
  describe('Property 5: Permission level hierarchy', () => {
    it('each level is a strict subset of the next higher level', () => {
      const hierarchy: PermissionLevel[] = [
        PermissionLevel.Viewer,
        PermissionLevel.Commenter,
        PermissionLevel.Editor,
        PermissionLevel.Owner,
      ];

      fc.assert(
        fc.property(
          fc.integer({ min: 0, max: hierarchy.length - 2 }),
          (lowerIndex) => {
            const lowerLevel = hierarchy[lowerIndex];
            const higherLevel = hierarchy[lowerIndex + 1];
            const lowerFlags = PermissionLevelFlags[lowerLevel];
            const higherFlags = PermissionLevelFlags[higherLevel];

            // Every flag in the lower level must be in the higher level (subset)
            for (const flag of lowerFlags) {
              expect(higherFlags.has(flag)).toBe(true);
            }

            // The higher level must have at least one flag not in the lower level (strict subset)
            let hasExtra = false;
            for (const flag of higherFlags) {
              if (!lowerFlags.has(flag)) {
                hasExtra = true;
                break;
              }
            }
            expect(hasExtra).toBe(true);
          },
        ),
        { numRuns: 100 },
      );
    });

    it('hierarchy holds when resolved through ACLService for any level pair', async () => {
      const hierarchy: PermissionLevel[] = [
        PermissionLevel.Viewer,
        PermissionLevel.Commenter,
        PermissionLevel.Editor,
        PermissionLevel.Owner,
      ];

      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 0, max: hierarchy.length - 2 }),
          fc.uuid(),
          async (lowerIndex, principalId) => {
            const repo = new InMemoryACLRepository();
            const service = new ACLService(repo);

            const lowerLevel = hierarchy[lowerIndex];
            const higherLevel = hierarchy[lowerIndex + 1];

            // Set up folder with lower-level ACL
            const lowerAcl = makeACL('acl-lower', [
              makeEntry({ principalId, permissionLevel: lowerLevel }),
            ]);
            repo.acls.set(lowerAcl.id, lowerAcl);
            const lowerFolder = makeFolder(
              'folder-lower',
              'owner',
              undefined,
              'acl-lower',
            );
            repo.folders.set(lowerFolder.id, lowerFolder);

            // Set up folder with higher-level ACL
            const higherAcl = makeACL('acl-higher', [
              makeEntry({ principalId, permissionLevel: higherLevel }),
            ]);
            repo.acls.set(higherAcl.id, higherAcl);
            const higherFolder = makeFolder(
              'folder-higher',
              'owner',
              undefined,
              'acl-higher',
            );
            repo.folders.set(higherFolder.id, higherFolder);

            const lowerResult = await service.getEffectivePermission(
              'folder-lower',
              'folder',
              principalId,
              defaultContext(),
            );
            const higherResult = await service.getEffectivePermission(
              'folder-higher',
              'folder',
              principalId,
              defaultContext(),
            );

            // Every flag from the lower level must appear in the higher level
            for (const flag of lowerResult.flags) {
              expect(higherResult.flags).toContain(flag);
            }

            // Higher level must have strictly more flags
            expect(higherResult.flags.length).toBeGreaterThan(
              lowerResult.flags.length,
            );
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 6: Inheritance override
   * If a file has an explicit ACL, the parent folder's ACL is never used.
   *
   * **Validates: Requirements 10.2, 10.3**
   */
  describe('Property 6: Inheritance override', () => {
    it('a file with an explicit ACL always uses its own ACL, not the parent folder ACL', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbPermissionLevel,
          arbPermissionLevel,
          fc.uuid(),
          async (fileLevel, folderLevel, principalId) => {
            const repo = new InMemoryACLRepository();
            const service = new ACLService(repo);

            // Parent folder with its own ACL
            const folderAcl = makeACL('acl-folder', [
              makeEntry({ principalId, permissionLevel: folderLevel }),
            ]);
            repo.acls.set(folderAcl.id, folderAcl);
            const folder = makeFolder(
              'parent',
              'owner',
              undefined,
              'acl-folder',
            );
            repo.folders.set(folder.id, folder);

            // File with its own explicit ACL
            const fileAcl = makeACL('acl-file', [
              makeEntry({ principalId, permissionLevel: fileLevel }),
            ]);
            repo.acls.set(fileAcl.id, fileAcl);
            const file = makeFile('the-file', 'owner', 'parent', 'acl-file');
            repo.files.set(file.id, file);

            const result = await service.getEffectivePermission(
              'the-file',
              'file',
              principalId,
              defaultContext(),
            );

            // Source must be 'explicit', never 'inherited'
            expect(result.source).toBe('explicit');

            // Flags must match the file's ACL level, not the folder's
            const expectedFlags =
              PermissionLevelFlags[fileLevel as PermissionLevel];
            expect(new Set(result.flags)).toEqual(expectedFlags);
          },
        ),
        { numRuns: 50 },
      );
    });
  });

  /**
   * Property 7: IP constraint denial
   * Access from an IP outside the ACL entry's CIDR range is always denied.
   *
   * **Validates: Requirements 12.1**
   */
  describe('Property 7: IP constraint denial', () => {
    it('access from an IP outside the CIDR range always throws IPConstraintViolationError', async () => {
      await fc.assert(
        fc.asyncProperty(
          arbCIDR,
          arbPermissionLevel,
          fc.uuid(),
          async (cidr, level, principalId) => {
            // Generate an IP outside the CIDR range
            const outsideIP = fc.sample(arbIPOutsideCIDR(cidr), 1)[0];

            const repo = new InMemoryACLRepository();
            const service = new ACLService(repo);

            const acl = makeACL('acl-ip', [
              makeEntry({
                principalId,
                permissionLevel: level,
                ipRange: cidr,
              }),
            ]);
            repo.acls.set(acl.id, acl);
            const folder = makeFolder(
              'folder-ip',
              'owner',
              undefined,
              'acl-ip',
            );
            repo.folders.set(folder.id, folder);

            await expect(
              service.getEffectivePermission(
                'folder-ip',
                'folder',
                principalId,
                defaultContext({ ipAddress: outsideIP }),
              ),
            ).rejects.toThrow(IPConstraintViolationError);
          },
        ),
        { numRuns: 50 },
      );
    });
  });
});
