import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import { PermissionFlag } from '../enumerations/permission-flag';
import { PermissionLevel } from '../enumerations/permission-level';
import {
  PermissionDeniedError,
  ShareLinkExpiredError,
  ShareLinkMaxAccessError,
  ShareLinkNotFoundError,
  ShareLinkPasswordError,
  ShareLinkRevokedError,
} from '../errors';
import type { IShareLinkBase } from '../interfaces/bases/share-link';
import type { ISharedItem } from '../interfaces/params/share-service-params';
import type { IShareRepository } from '../interfaces/services/share-repository';
import { IShareServiceDeps, ShareService } from '../services/share-service';

// ── Helpers ─────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `id-${++idCounter}`;
}

function makeMockRepository(): jest.Mocked<IShareRepository<string>> {
  return {
    createShareLink: jest.fn(),
    getShareLinkById: jest.fn(),
    getShareLinkByToken: jest.fn(),
    updateShareLink: jest.fn(),
    deleteShareLink: jest.fn(),
    getShareLinksForFile: jest.fn(),
    getSharedItems: jest.fn(),
  };
}

function makeMockDeps(): jest.Mocked<IShareServiceDeps<string>> {
  return {
    checkPermissionFlag: jest.fn().mockResolvedValue(true),
    setACLEntry: jest.fn().mockResolvedValue(undefined),
    wrapKeyForMember: jest.fn().mockResolvedValue({
      id: 'kw-1',
      fileVersionId: 'fv-1',
      recipientType: 'internal_member',
      recipientUserId: 'user-1',
      wrappingPublicKey: new Uint8Array([10, 20, 30]),
      encryptedSymmetricKey: new Uint8Array([99, 99, 99]),
      keyType: 'ecies_secp256k1',
      createdBy: 'requester-1',
      ledgerEntryHash: new Uint8Array([7, 8, 9]),
      createdAt: new Date().toISOString(),
    }),
    wrapKeyForEphemeralShare: jest.fn().mockResolvedValue({
      entry: {
        id: 'kw-eph-1',
        fileVersionId: 'fv-1',
        recipientType: 'ephemeral_share',
        wrappingPublicKey: new Uint8Array([1, 2, 3]),
        encryptedSymmetricKey: new Uint8Array([99, 99, 99]),
        keyType: 'ecies_secp256k1',
        createdBy: 'requester-1',
        ledgerEntryHash: new Uint8Array([7, 8, 9]),
        createdAt: new Date().toISOString(),
      },
      ephemeralPrivateKey: new Uint8Array([4, 5, 6]),
    }),
    wrapKeyForRecipientKey: jest.fn().mockResolvedValue({
      id: 'kw-rk-1',
      fileVersionId: 'fv-1',
      recipientType: 'recipient_key',
      wrappingPublicKey: new Uint8Array([77, 78, 79]),
      encryptedSymmetricKey: new Uint8Array([99, 99, 99]),
      keyType: 'ecies_secp256k1',
      createdBy: 'requester-1',
      ledgerEntryHash: new Uint8Array([7, 8, 9]),
      createdAt: new Date().toISOString(),
    }),
    revokeWrapping: jest.fn().mockResolvedValue(undefined),
    readVaultSymmetricKey: jest.fn().mockResolvedValue({
      symmetricKey: new Uint8Array([42, 43, 44]),
      currentVersionId: 'fv-1',
    }),
    getFileContent: jest.fn().mockResolvedValue(new ReadableStream()),
    hashPassword: jest.fn().mockResolvedValue('hashed-password'),
    verifyPassword: jest.fn().mockResolvedValue(true),
    generateToken: jest.fn().mockReturnValue('unique-token-abc'),
    getMagnetUrlForFile: jest
      .fn()
      .mockResolvedValue('magnet:?xt=urn:btih:abc123'),
    onAuditLog: jest.fn().mockResolvedValue(undefined),
    queryAuditLog: jest.fn().mockResolvedValue([]),
  } as jest.Mocked<IShareServiceDeps<string>>;
}

function makeShareLink(
  overrides: Partial<IShareLinkBase<string>> = {},
): IShareLinkBase<string> {
  return {
    id: 'link-1',
    fileId: 'file-1',
    token: 'unique-token-abc',
    createdBy: 'user-1',
    currentAccessCount: 0,
    permissionLevel: 'viewer',
    scope: 'anonymous',
    blockDownload: false,
    includeMagnetUrl: false,
    encryptionMode: 'server_proxied',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('ShareService', () => {
  let mockRepo: jest.Mocked<IShareRepository<string>>;
  let mockDeps: jest.Mocked<IShareServiceDeps<string>>;
  let service: ShareService<string>;

  beforeEach(() => {
    idCounter = 0;
    mockRepo = makeMockRepository();
    mockDeps = makeMockDeps();
    service = new ShareService(mockRepo, mockDeps, generateId);
  });

  // ── Spec Property: can_reshare=false blocks re-sharing ──────────

  describe('can_reshare=false blocks re-sharing', () => {
    it('ACL entry has canReshare=false when canReshare is not provided', async () => {
      await service.shareWithUser({
        fileId: 'file-1',
        targetType: 'file',
        recipientId: 'recipient-1',
        permissionLevel: PermissionLevel.Viewer,
      });

      expect(mockDeps.setACLEntry).toHaveBeenCalledWith(
        'file-1',
        'file',
        expect.objectContaining({ canReshare: false }),
        'recipient-1',
      );
    });

    it('ACL entry has canReshare=false when explicitly set to false', async () => {
      await service.shareWithUser({
        fileId: 'file-1',
        targetType: 'file',
        recipientId: 'recipient-1',
        permissionLevel: PermissionLevel.Viewer,
        canReshare: false,
      });

      const aclEntry = mockDeps.setACLEntry.mock.calls[0][2];
      expect(aclEntry.canReshare).toBe(false);
    });

    it('ACL entry has canReshare=true when explicitly set to true', async () => {
      await service.shareWithUser({
        fileId: 'file-1',
        targetType: 'file',
        recipientId: 'recipient-1',
        permissionLevel: PermissionLevel.Editor,
        canReshare: true,
      });

      const aclEntry = mockDeps.setACLEntry.mock.calls[0][2];
      expect(aclEntry.canReshare).toBe(true);
    });
  });

  // ── Spec Property: Ephemeral key pair — server never stores private key ──

  describe('Ephemeral key pair mode: server never stores private key', () => {
    it('ephemeral share link entry does not contain the ephemeral private key', async () => {
      mockRepo.createShareLink.mockImplementation(async (link) => link);

      await service.createShareLink(
        {
          fileId: 'file-1',
          scope: 'anonymous',
          encryptionMode: 'ephemeral_key_pair',
        },
        'requester-1',
      );

      // The stored share link should have ephemeralPublicKey but NOT the private key
      const storedLink = mockRepo.createShareLink.mock.calls[0][0];
      expect(storedLink.ephemeralPublicKey).toBeDefined();

      // Verify no field on the stored link matches the ephemeral private key
      const ephemeralPrivateKey = new Uint8Array([4, 5, 6]);
      const linkValues = Object.values(storedLink);
      for (const val of linkValues) {
        if (val instanceof Uint8Array) {
          expect(
            Buffer.from(val).equals(Buffer.from(ephemeralPrivateKey)),
          ).toBe(false);
        }
      }
    });
  });

  // ── Spec Property: Share link expiration and max access count ───

  describe('Share link expiration and max access count enforcement', () => {
    it('throws ShareLinkExpiredError for expired link', async () => {
      const expiredLink = makeShareLink({
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      });
      mockRepo.getShareLinkByToken.mockResolvedValue(expiredLink);

      await expect(service.accessShareLink('unique-token-abc')).rejects.toThrow(
        ShareLinkExpiredError,
      );
    });

    it('throws ShareLinkMaxAccessError when max access count reached', async () => {
      const maxedLink = makeShareLink({
        maxAccessCount: 5,
        currentAccessCount: 5,
      });
      mockRepo.getShareLinkByToken.mockResolvedValue(maxedLink);

      await expect(service.accessShareLink('unique-token-abc')).rejects.toThrow(
        ShareLinkMaxAccessError,
      );
    });

    it('allows access when expiration is in the future', async () => {
      const validLink = makeShareLink({
        expiresAt: new Date(Date.now() + 3_600_000).toISOString(),
      });
      mockRepo.getShareLinkByToken.mockResolvedValue(validLink);
      mockRepo.updateShareLink.mockImplementation(async (link) => link);

      await expect(
        service.accessShareLink('unique-token-abc'),
      ).resolves.toBeDefined();
    });

    it('allows access when access count is below max', async () => {
      const validLink = makeShareLink({
        maxAccessCount: 5,
        currentAccessCount: 3,
      });
      mockRepo.getShareLinkByToken.mockResolvedValue(validLink);
      mockRepo.updateShareLink.mockImplementation(async (link) => link);

      await expect(
        service.accessShareLink('unique-token-abc'),
      ).resolves.toBeDefined();
    });
  });

  // ── Spec Property: block_download prevents magnet URL exposure ──

  describe('block_download prevents magnet URL exposure', () => {
    it('throws PermissionDeniedError when user lacks Download permission', async () => {
      mockDeps.checkPermissionFlag.mockResolvedValue(false);

      await expect(
        service.getMagnetUrl('file-1', 'user-no-download'),
      ).rejects.toThrow(PermissionDeniedError);

      expect(mockDeps.checkPermissionFlag).toHaveBeenCalledWith(
        'file-1',
        'file',
        'user-no-download',
        PermissionFlag.Download,
        expect.any(Object),
      );
    });
  });

  // ── Spec Property: Organization-scoped link denies outsiders ────

  describe('Organization-scoped link denies access to outsiders', () => {
    it('throws PermissionDeniedError for org-scoped link without organizationId', async () => {
      const orgLink = makeShareLink({
        scope: 'organization',
        // organizationId is undefined — simulates outsider access
      });
      mockRepo.getShareLinkByToken.mockResolvedValue(orgLink);

      await expect(service.accessShareLink('unique-token-abc')).rejects.toThrow(
        PermissionDeniedError,
      );
    });

    it('allows access for org-scoped link with valid organizationId', async () => {
      const orgLink = makeShareLink({
        scope: 'organization',
        organizationId: 'org-1',
      });
      mockRepo.getShareLinkByToken.mockResolvedValue(orgLink);
      mockRepo.updateShareLink.mockImplementation(async (link) => link);

      await expect(
        service.accessShareLink('unique-token-abc'),
      ).resolves.toBeDefined();
    });
  });

  // ── shareWithUser ───────────────────────────────────────────────

  describe('shareWithUser', () => {
    it('creates ACL entry for recipient', async () => {
      await service.shareWithUser({
        fileId: 'file-1',
        targetType: 'file',
        recipientId: 'recipient-1',
        permissionLevel: PermissionLevel.Editor,
        canReshare: true,
      });

      expect(mockDeps.setACLEntry).toHaveBeenCalledWith(
        'file-1',
        'file',
        expect.objectContaining({
          principalType: 'user',
          principalId: 'recipient-1',
          permissionLevel: PermissionLevel.Editor,
          canReshare: true,
          blockDownload: false,
        }),
        'recipient-1',
      );
    });

    it('wraps key for file shares', async () => {
      await service.shareWithUser({
        fileId: 'file-1',
        targetType: 'file',
        recipientId: 'recipient-1',
        permissionLevel: PermissionLevel.Viewer,
      });

      expect(mockDeps.readVaultSymmetricKey).toHaveBeenCalledWith('file-1');
      expect(mockDeps.wrapKeyForMember).toHaveBeenCalledWith(
        'fv-1',
        new Uint8Array([42, 43, 44]),
        'recipient-1',
        'recipient-1',
      );
    });

    it('does not wrap key for folder shares', async () => {
      await service.shareWithUser({
        folderId: 'folder-1',
        targetType: 'folder',
        recipientId: 'recipient-1',
        permissionLevel: PermissionLevel.Viewer,
      });

      expect(mockDeps.readVaultSymmetricKey).not.toHaveBeenCalled();
      expect(mockDeps.wrapKeyForMember).not.toHaveBeenCalled();
    });

    it('logs ShareCreated audit event', async () => {
      await service.shareWithUser({
        fileId: 'file-1',
        targetType: 'file',
        recipientId: 'recipient-1',
        permissionLevel: PermissionLevel.Viewer,
      });

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.ShareCreated,
          actorId: 'recipient-1',
          targetId: 'file-1',
          targetType: 'file',
        }),
      );
    });

    it('throws when neither fileId nor folderId is provided', async () => {
      await expect(
        service.shareWithUser({
          targetType: 'file',
          recipientId: 'recipient-1',
          permissionLevel: PermissionLevel.Viewer,
        }),
      ).rejects.toThrow('Either fileId or folderId must be provided');
    });
  });

  // ── createShareLink ─────────────────────────────────────────────

  describe('createShareLink', () => {
    beforeEach(() => {
      mockRepo.createShareLink.mockImplementation(async (link) => link);
    });

    it('creates server_proxied link without key wrapping', async () => {
      const result = await service.createShareLink(
        {
          fileId: 'file-1',
          scope: 'anonymous',
          encryptionMode: 'server_proxied',
        },
        'requester-1',
      );

      expect(result.encryptionMode).toBe('server_proxied');
      expect(result.token).toBe('unique-token-abc');
      expect(mockDeps.readVaultSymmetricKey).not.toHaveBeenCalled();
      expect(mockDeps.wrapKeyForEphemeralShare).not.toHaveBeenCalled();
      expect(mockDeps.wrapKeyForRecipientKey).not.toHaveBeenCalled();
    });

    it('creates ephemeral_key_pair link with key wrapping', async () => {
      const result = await service.createShareLink(
        {
          fileId: 'file-1',
          scope: 'anonymous',
          encryptionMode: 'ephemeral_key_pair',
        },
        'requester-1',
      );

      expect(result.encryptionMode).toBe('ephemeral_key_pair');
      expect(mockDeps.readVaultSymmetricKey).toHaveBeenCalledWith('file-1');
      expect(mockDeps.wrapKeyForEphemeralShare).toHaveBeenCalled();
      expect(result.keyWrappingEntryId).toBe('kw-eph-1');
      expect(result.ephemeralPublicKey).toEqual(new Uint8Array([1, 2, 3]));
    });

    it('creates recipient_public_key link with key wrapping', async () => {
      const result = await service.createShareLink(
        {
          fileId: 'file-1',
          scope: 'specific_people',
          encryptionMode: 'recipient_public_key',
          recipientPublicKey: new Uint8Array([77, 78, 79]),
          recipientKeyType: 'ecies_secp256k1',
        },
        'requester-1',
      );

      expect(result.encryptionMode).toBe('recipient_public_key');
      expect(mockDeps.readVaultSymmetricKey).toHaveBeenCalledWith('file-1');
      expect(mockDeps.wrapKeyForRecipientKey).toHaveBeenCalledWith(
        'fv-1',
        new Uint8Array([42, 43, 44]),
        new Uint8Array([77, 78, 79]),
        'ecies_secp256k1',
        'id-1', // shareLinkId from generateId
        'requester-1',
      );
      expect(result.keyWrappingEntryId).toBe('kw-rk-1');
    });

    it('hashes password when provided', async () => {
      const result = await service.createShareLink(
        {
          fileId: 'file-1',
          scope: 'anonymous',
          encryptionMode: 'server_proxied',
          password: 'my-secret',
        },
        'requester-1',
      );

      expect(mockDeps.hashPassword).toHaveBeenCalledWith('my-secret');
      expect(result.passwordHash).toBe('hashed-password');
    });

    it('throws PermissionDeniedError when user lacks Share permission', async () => {
      mockDeps.checkPermissionFlag.mockResolvedValue(false);

      await expect(
        service.createShareLink(
          {
            fileId: 'file-1',
            scope: 'anonymous',
            encryptionMode: 'server_proxied',
          },
          'requester-no-share',
        ),
      ).rejects.toThrow(PermissionDeniedError);

      expect(mockDeps.checkPermissionFlag).toHaveBeenCalledWith(
        'file-1',
        'file',
        'requester-no-share',
        PermissionFlag.Share,
        expect.any(Object),
      );
    });

    it('logs ShareCreated audit event', async () => {
      await service.createShareLink(
        {
          fileId: 'file-1',
          scope: 'anonymous',
          encryptionMode: 'server_proxied',
        },
        'requester-1',
      );

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.ShareCreated,
          actorId: 'requester-1',
          targetId: 'file-1',
          targetType: 'file',
        }),
      );
    });

    it('sets default values for optional params', async () => {
      const result = await service.createShareLink(
        {
          fileId: 'file-1',
          scope: 'anonymous',
          encryptionMode: 'server_proxied',
        },
        'requester-1',
      );

      expect(result.permissionLevel).toBe('viewer');
      expect(result.blockDownload).toBe(false);
      expect(result.includeMagnetUrl).toBe(false);
      expect(result.currentAccessCount).toBe(0);
    });
  });

  // ── accessShareLink ─────────────────────────────────────────────

  describe('accessShareLink', () => {
    it('returns decrypted stream for server_proxied mode', async () => {
      const link = makeShareLink({ encryptionMode: 'server_proxied' });
      mockRepo.getShareLinkByToken.mockResolvedValue(link);
      mockRepo.updateShareLink.mockImplementation(async (l) => l);
      const mockStream = new ReadableStream();
      mockDeps.getFileContent.mockResolvedValue(mockStream);

      const result = await service.accessShareLink('unique-token-abc');

      expect(result.decryptedStream).toBe(mockStream);
      expect(result.shareLink).toBeDefined();
    });

    it('returns share link for ephemeral mode (client decrypts)', async () => {
      const link = makeShareLink({
        encryptionMode: 'ephemeral_key_pair',
        ephemeralPublicKey: new Uint8Array([1, 2, 3]),
      });
      mockRepo.getShareLinkByToken.mockResolvedValue(link);
      mockRepo.updateShareLink.mockImplementation(async (l) => l);

      const result = await service.accessShareLink('unique-token-abc');

      expect(result.shareLink).toBeDefined();
      expect(result.encryptedSymmetricKey).toEqual(new Uint8Array([1, 2, 3]));
      expect(result.decryptedStream).toBeUndefined();
    });

    it('throws ShareLinkNotFoundError for invalid token', async () => {
      mockRepo.getShareLinkByToken.mockResolvedValue(null);

      await expect(
        service.accessShareLink('nonexistent-token'),
      ).rejects.toThrow(ShareLinkNotFoundError);
    });

    it('throws ShareLinkRevokedError for revoked link', async () => {
      const revokedLink = makeShareLink({
        revokedAt: new Date().toISOString(),
      });
      mockRepo.getShareLinkByToken.mockResolvedValue(revokedLink);

      await expect(service.accessShareLink('unique-token-abc')).rejects.toThrow(
        ShareLinkRevokedError,
      );
    });

    it('throws ShareLinkExpiredError for expired link', async () => {
      const expiredLink = makeShareLink({
        expiresAt: new Date(Date.now() - 60_000).toISOString(),
      });
      mockRepo.getShareLinkByToken.mockResolvedValue(expiredLink);

      await expect(service.accessShareLink('unique-token-abc')).rejects.toThrow(
        ShareLinkExpiredError,
      );
    });

    it('throws ShareLinkMaxAccessError when max access count reached', async () => {
      const maxedLink = makeShareLink({
        maxAccessCount: 3,
        currentAccessCount: 3,
      });
      mockRepo.getShareLinkByToken.mockResolvedValue(maxedLink);

      await expect(service.accessShareLink('unique-token-abc')).rejects.toThrow(
        ShareLinkMaxAccessError,
      );
    });

    it('throws ShareLinkPasswordError for wrong password', async () => {
      const protectedLink = makeShareLink({
        passwordHash: 'hashed-pw',
      });
      mockRepo.getShareLinkByToken.mockResolvedValue(protectedLink);
      mockDeps.verifyPassword.mockResolvedValue(false);

      await expect(
        service.accessShareLink('unique-token-abc', 'wrong-password'),
      ).rejects.toThrow(ShareLinkPasswordError);
    });

    it('throws ShareLinkPasswordError when password required but not provided', async () => {
      const protectedLink = makeShareLink({
        passwordHash: 'hashed-pw',
      });
      mockRepo.getShareLinkByToken.mockResolvedValue(protectedLink);

      await expect(service.accessShareLink('unique-token-abc')).rejects.toThrow(
        ShareLinkPasswordError,
      );
    });

    it('increments access count on successful access', async () => {
      const link = makeShareLink({ currentAccessCount: 2 });
      mockRepo.getShareLinkByToken.mockResolvedValue(link);
      mockRepo.updateShareLink.mockImplementation(async (l) => l);

      await service.accessShareLink('unique-token-abc');

      expect(mockRepo.updateShareLink).toHaveBeenCalledWith(
        expect.objectContaining({ currentAccessCount: 3 }),
      );
    });

    it('logs ShareLinkAccessed audit event', async () => {
      const link = makeShareLink();
      mockRepo.getShareLinkByToken.mockResolvedValue(link);
      mockRepo.updateShareLink.mockImplementation(async (l) => l);

      await service.accessShareLink('unique-token-abc', undefined, {
        ipAddress: '192.168.1.1',
        timestamp: new Date(),
      });

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.ShareLinkAccessed,
          targetId: 'file-1',
          targetType: 'file',
          ipAddress: '192.168.1.1',
        }),
      );
    });
  });

  // ── revokeShareLink ─────────────────────────────────────────────

  describe('revokeShareLink', () => {
    it('sets revokedAt and revokes key wrapping entry', async () => {
      const link = makeShareLink({
        keyWrappingEntryId: 'kw-entry-1',
      });
      mockRepo.getShareLinkById.mockResolvedValue(link);
      mockRepo.updateShareLink.mockImplementation(async (l) => l);

      await service.revokeShareLink('link-1', 'requester-1');

      expect(mockDeps.revokeWrapping).toHaveBeenCalledWith(
        'kw-entry-1',
        'requester-1',
      );
      expect(mockRepo.updateShareLink).toHaveBeenCalledWith(
        expect.objectContaining({
          revokedAt: expect.any(String),
        }),
      );
    });

    it('does not call revokeWrapping when no keyWrappingEntryId', async () => {
      const link = makeShareLink();
      mockRepo.getShareLinkById.mockResolvedValue(link);
      mockRepo.updateShareLink.mockImplementation(async (l) => l);

      await service.revokeShareLink('link-1', 'requester-1');

      expect(mockDeps.revokeWrapping).not.toHaveBeenCalled();
    });

    it('logs ShareRevoked audit event', async () => {
      const link = makeShareLink();
      mockRepo.getShareLinkById.mockResolvedValue(link);
      mockRepo.updateShareLink.mockImplementation(async (l) => l);

      await service.revokeShareLink('link-1', 'requester-1');

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.ShareRevoked,
          actorId: 'requester-1',
          targetId: 'file-1',
          targetType: 'file',
        }),
      );
    });

    it('throws ShareLinkNotFoundError when link does not exist', async () => {
      mockRepo.getShareLinkById.mockResolvedValue(null);

      await expect(
        service.revokeShareLink('nonexistent', 'requester-1'),
      ).rejects.toThrow(ShareLinkNotFoundError);
    });
  });

  // ── getMagnetUrl ────────────────────────────────────────────────

  describe('getMagnetUrl', () => {
    it('returns magnet URL with irrevocability warning', async () => {
      const result = await service.getMagnetUrl('file-1', 'user-1');

      expect(result.magnetUrl).toBe('magnet:?xt=urn:btih:abc123');
      expect(result.warning).toContain('irrevocable');
    });

    it('throws PermissionDeniedError when user lacks Download permission', async () => {
      mockDeps.checkPermissionFlag.mockResolvedValue(false);

      await expect(
        service.getMagnetUrl('file-1', 'user-no-download'),
      ).rejects.toThrow(PermissionDeniedError);
    });

    it('logs MagnetUrlDisclosed audit event', async () => {
      await service.getMagnetUrl('file-1', 'user-1');

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.MagnetUrlDisclosed,
          actorId: 'user-1',
          targetId: 'file-1',
          targetType: 'file',
        }),
      );
    });

    it('throws when getMagnetUrlForFile is not configured', async () => {
      mockDeps.getMagnetUrlForFile = undefined;

      await expect(service.getMagnetUrl('file-1', 'user-1')).rejects.toThrow(
        'Magnet URL generation is not configured',
      );
    });
  });

  // ── getShareAuditTrail ──────────────────────────────────────────

  describe('getShareAuditTrail', () => {
    it('returns audit entries for file', async () => {
      const mockEntries = [{ id: 'audit-1' }, { id: 'audit-2' }];
      (mockDeps.queryAuditLog as jest.Mock).mockResolvedValue(mockEntries);

      const result = await service.getShareAuditTrail('file-1', 'admin-user');

      expect(result).toEqual(mockEntries);
      expect(mockDeps.queryAuditLog).toHaveBeenCalledWith({
        targetId: 'file-1',
      });
    });

    it('throws PermissionDeniedError when user lacks Admin permission', async () => {
      mockDeps.checkPermissionFlag.mockResolvedValue(false);

      await expect(
        service.getShareAuditTrail('file-1', 'non-admin'),
      ).rejects.toThrow(PermissionDeniedError);

      expect(mockDeps.checkPermissionFlag).toHaveBeenCalledWith(
        'file-1',
        'file',
        'non-admin',
        PermissionFlag.Admin,
        expect.any(Object),
      );
    });

    it('returns empty array when queryAuditLog is not configured', async () => {
      mockDeps.queryAuditLog = undefined;

      const result = await service.getShareAuditTrail('file-1', 'admin-user');

      expect(result).toEqual([]);
    });
  });

  // ── getSharedWithMe ─────────────────────────────────────────────

  describe('getSharedWithMe', () => {
    it('delegates to repository', async () => {
      const mockItems: ISharedItem<string>[] = [
        {
          itemId: 'file-1',
          itemType: 'file',
          sharedBy: 'user-2',
          permissionLevel: PermissionLevel.Viewer,
          sharedAt: new Date().toISOString(),
        },
      ];
      mockRepo.getSharedItems.mockResolvedValue(mockItems);

      const result = await service.getSharedWithMe('user-1');

      expect(result).toEqual(mockItems);
      expect(mockRepo.getSharedItems).toHaveBeenCalledWith('user-1');
    });
  });
});
