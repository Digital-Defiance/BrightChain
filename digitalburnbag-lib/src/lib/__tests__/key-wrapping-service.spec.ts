import { FileAuditOperationType } from '../enumerations/file-audit-operation-type';
import type { IKeyWrappingEntryBase } from '../interfaces/bases/key-wrapping-entry';
import type { IKeyWrappingRepository } from '../interfaces/services/key-wrapping-repository';
import {
  IKeyWrappingServiceDeps,
  KeyWrappingService,
} from '../services/key-wrapping-service';

// ── Helpers ─────────────────────────────────────────────────────────

let idCounter = 0;
function generateId(): string {
  return `id-${++idCounter}`;
}

function makeMockRepository(): jest.Mocked<IKeyWrappingRepository<string>> {
  return {
    createEntry: jest.fn(),
    getEntry: jest.fn(),
    getEntryByRecipient: jest.fn(),
    getEntryByShareLink: jest.fn(),
    deleteEntry: jest.fn(),
    deleteAllForFileVersion: jest.fn(),
    getEntriesForFileVersion: jest.fn(),
  };
}

function makeMockDeps(): jest.Mocked<IKeyWrappingServiceDeps<string>> {
  return {
    eciesEncrypt: jest.fn().mockResolvedValue(new Uint8Array([99, 99, 99])),
    generateEciesKeyPair: jest.fn().mockResolvedValue({
      publicKey: new Uint8Array([1, 2, 3]),
      privateKey: new Uint8Array([4, 5, 6]),
    }),
    getUserPublicKey: jest.fn().mockResolvedValue(new Uint8Array([10, 20, 30])),
    recordOnLedger: jest.fn().mockResolvedValue(new Uint8Array([7, 8, 9])),
    onAuditLog: jest.fn().mockResolvedValue(undefined),
  } as jest.Mocked<IKeyWrappingServiceDeps<string>>;
}

function makeEntry(
  overrides: Partial<IKeyWrappingEntryBase<string>> = {},
): IKeyWrappingEntryBase<string> {
  return {
    id: 'entry-1',
    fileVersionId: 'fv-1',
    recipientType: 'internal_member',
    recipientUserId: 'user-1',
    wrappingPublicKey: new Uint8Array([10, 20, 30]),
    encryptedSymmetricKey: new Uint8Array([99, 99, 99]),
    keyType: 'ecies_secp256k1',
    createdBy: 'requester-1',
    ledgerEntryHash: new Uint8Array([7, 8, 9]),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('KeyWrappingService', () => {
  let mockRepo: jest.Mocked<IKeyWrappingRepository<string>>;
  let mockDeps: jest.Mocked<IKeyWrappingServiceDeps<string>>;
  let service: KeyWrappingService<string>;

  beforeEach(() => {
    idCounter = 0;
    mockRepo = makeMockRepository();
    mockDeps = makeMockDeps();
    service = new KeyWrappingService(mockRepo, mockDeps, generateId);
  });

  // ── Property 8: Plaintext key never stored ──────────────────────

  describe('Property 8: Plaintext key never stored', () => {
    it('wrapKeyForMember: encryptedSymmetricKey differs from plaintext', async () => {
      const plaintext = new Uint8Array([42, 43, 44]);
      const encrypted = new Uint8Array([99, 99, 99]);
      mockDeps.eciesEncrypt.mockResolvedValue(encrypted);
      const storedEntry = makeEntry({ encryptedSymmetricKey: encrypted });
      mockRepo.createEntry.mockResolvedValue(storedEntry);

      const result = await service.wrapKeyForMember(
        'fv-1',
        plaintext,
        'user-1',
        'requester-1',
      );

      // The stored encrypted key must not equal the plaintext
      expect(
        Buffer.from(result.encryptedSymmetricKey).equals(
          Buffer.from(plaintext),
        ),
      ).toBe(false);
      // Verify eciesEncrypt was actually called (not bypassed)
      expect(mockDeps.eciesEncrypt).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        plaintext,
      );
    });

    it('wrapKeyForEphemeralShare: encryptedSymmetricKey differs from plaintext', async () => {
      const plaintext = new Uint8Array([50, 51, 52]);
      const encrypted = new Uint8Array([200, 201, 202]);
      mockDeps.eciesEncrypt.mockResolvedValue(encrypted);
      const storedEntry = makeEntry({
        recipientType: 'ephemeral_share',
        encryptedSymmetricKey: encrypted,
      });
      mockRepo.createEntry.mockResolvedValue(storedEntry);

      const { entry } = await service.wrapKeyForEphemeralShare(
        'fv-1',
        plaintext,
        'share-1',
        'requester-1',
      );

      expect(
        Buffer.from(entry.encryptedSymmetricKey).equals(Buffer.from(plaintext)),
      ).toBe(false);
      expect(mockDeps.eciesEncrypt).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        plaintext,
      );
    });

    it('wrapKeyForRecipientKey: encryptedSymmetricKey differs from plaintext', async () => {
      const plaintext = new Uint8Array([60, 61, 62]);
      const encrypted = new Uint8Array([150, 151, 152]);
      mockDeps.eciesEncrypt.mockResolvedValue(encrypted);
      const storedEntry = makeEntry({
        recipientType: 'recipient_key',
        encryptedSymmetricKey: encrypted,
      });
      mockRepo.createEntry.mockResolvedValue(storedEntry);

      const result = await service.wrapKeyForRecipientKey(
        'fv-1',
        plaintext,
        new Uint8Array([77, 78, 79]),
        'ecies_secp256k1',
        'share-1',
        'requester-1',
      );

      expect(
        Buffer.from(result.encryptedSymmetricKey).equals(
          Buffer.from(plaintext),
        ),
      ).toBe(false);
      expect(mockDeps.eciesEncrypt).toHaveBeenCalledWith(
        expect.any(Uint8Array),
        plaintext,
      );
    });

    it('entry passed to repository never contains the plaintext key', async () => {
      const plaintext = new Uint8Array([10, 11, 12]);
      const encrypted = new Uint8Array([99, 99, 99]);
      mockDeps.eciesEncrypt.mockResolvedValue(encrypted);
      mockRepo.createEntry.mockImplementation(async (entry) => entry);

      await service.wrapKeyForMember('fv-1', plaintext, 'user-1', 'req-1');

      const savedEntry = mockRepo.createEntry.mock.calls[0][0];
      expect(
        Buffer.from(savedEntry.encryptedSymmetricKey).equals(
          Buffer.from(plaintext),
        ),
      ).toBe(false);
      expect(
        Buffer.from(savedEntry.encryptedSymmetricKey).equals(
          Buffer.from(encrypted),
        ),
      ).toBe(true);
    });
  });

  // ── Property 9: Revocation completeness ─────────────────────────

  describe('Property 9: Revocation completeness', () => {
    it('after revokeAllWrappings, getWrappedKey returns null for all previously wrapped recipients', async () => {
      const recipients = ['user-a', 'user-b', 'user-c'];
      const fileVersionId = 'fv-1';

      // Simulate wrapping for each recipient
      for (const userId of recipients) {
        const entry = makeEntry({ recipientUserId: userId });
        mockRepo.createEntry.mockResolvedValueOnce(entry);
        await service.wrapKeyForMember(
          fileVersionId,
          new Uint8Array([1, 2, 3]),
          userId,
          'requester-1',
        );
      }

      // Revoke all
      mockRepo.deleteAllForFileVersion.mockResolvedValue(recipients.length);
      const count = await service.revokeAllWrappings(
        fileVersionId,
        'requester-1',
      );
      expect(count).toBe(recipients.length);

      // After revocation, repository returns null for every recipient
      mockRepo.getEntryByRecipient.mockResolvedValue(null);
      for (const userId of recipients) {
        const result = await service.getWrappedKey(fileVersionId, userId);
        expect(result).toBeNull();
      }
    });

    it('after revokeAllWrappings, getWrappedKey returns null for share links too', async () => {
      const shareLinks = ['share-a', 'share-b'];
      const fileVersionId = 'fv-2';

      for (const shareLinkId of shareLinks) {
        const entry = makeEntry({
          recipientType: 'ephemeral_share',
          shareLinkId,
        });
        mockRepo.createEntry.mockResolvedValueOnce(entry);
        await service.wrapKeyForEphemeralShare(
          fileVersionId,
          new Uint8Array([5, 6, 7]),
          shareLinkId,
          'requester-1',
        );
      }

      mockRepo.deleteAllForFileVersion.mockResolvedValue(shareLinks.length);
      await service.revokeAllWrappings(fileVersionId, 'requester-1');

      mockRepo.getEntryByShareLink.mockResolvedValue(null);
      for (const shareLinkId of shareLinks) {
        const result = await service.getWrappedKey(
          fileVersionId,
          undefined,
          shareLinkId,
        );
        expect(result).toBeNull();
      }
    });
  });

  // ── wrapKeyForMember ────────────────────────────────────────────

  describe('wrapKeyForMember', () => {
    it('creates entry with correct recipientType and recipientUserId', async () => {
      mockRepo.createEntry.mockImplementation(async (entry) => entry);

      const result = await service.wrapKeyForMember(
        'fv-1',
        new Uint8Array([1, 2, 3]),
        'recipient-42',
        'requester-1',
      );

      expect(result.recipientType).toBe('internal_member');
      expect(result.recipientUserId).toBe('recipient-42');
      expect(result.fileVersionId).toBe('fv-1');
      expect(result.createdBy).toBe('requester-1');
    });

    it('fetches recipient public key and encrypts with it', async () => {
      mockRepo.createEntry.mockImplementation(async (entry) => entry);

      await service.wrapKeyForMember(
        'fv-1',
        new Uint8Array([1, 2, 3]),
        'recipient-42',
        'requester-1',
      );

      expect(mockDeps.getUserPublicKey).toHaveBeenCalledWith('recipient-42');
      expect(mockDeps.eciesEncrypt).toHaveBeenCalledWith(
        new Uint8Array([10, 20, 30]), // mock public key
        new Uint8Array([1, 2, 3]),
      );
    });

    it('records event on ledger', async () => {
      mockRepo.createEntry.mockImplementation(async (entry) => entry);

      await service.wrapKeyForMember(
        'fv-1',
        new Uint8Array([1, 2, 3]),
        'user-1',
        'requester-1',
      );

      expect(mockDeps.recordOnLedger).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'key_wrap',
          recipientType: 'internal_member',
        }),
      );
    });

    it('logs ShareCreated audit event', async () => {
      mockRepo.createEntry.mockImplementation(async (entry) => entry);

      await service.wrapKeyForMember(
        'fv-1',
        new Uint8Array([1, 2, 3]),
        'user-1',
        'requester-1',
      );

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.ShareCreated,
          actorId: 'requester-1',
          targetId: 'fv-1',
        }),
      );
    });
  });

  // ── wrapKeyForEphemeralShare ────────────────────────────────────

  describe('wrapKeyForEphemeralShare', () => {
    it('returns ephemeral private key that is NOT stored in the entry', async () => {
      mockRepo.createEntry.mockImplementation(async (e) => e);

      const { entry: _entry, ephemeralPrivateKey } =
        await service.wrapKeyForEphemeralShare(
          'fv-1',
          new Uint8Array([1, 2, 3]),
          'share-1',
          'requester-1',
        );

      // Private key is returned to caller
      expect(ephemeralPrivateKey).toEqual(new Uint8Array([4, 5, 6]));

      // Entry stored in repo does NOT contain the private key
      const savedEntry = mockRepo.createEntry.mock.calls[0][0];
      // The entry has wrappingPublicKey (the public part), not the private key
      expect(savedEntry.wrappingPublicKey).toEqual(new Uint8Array([1, 2, 3]));
      // Verify no field on the entry matches the private key
      const entryValues = Object.values(savedEntry);
      for (const val of entryValues) {
        if (val instanceof Uint8Array) {
          expect(
            Buffer.from(val).equals(Buffer.from(ephemeralPrivateKey)),
          ).toBe(false);
        }
      }
    });

    it('creates entry with ephemeral_share recipientType and shareLinkId', async () => {
      mockRepo.createEntry.mockImplementation(async (entry) => entry);

      const { entry } = await service.wrapKeyForEphemeralShare(
        'fv-1',
        new Uint8Array([1, 2, 3]),
        'share-link-99',
        'requester-1',
      );

      expect(entry.recipientType).toBe('ephemeral_share');
      expect(entry.shareLinkId).toBe('share-link-99');
    });

    it('generates a new ECIES key pair', async () => {
      mockRepo.createEntry.mockImplementation(async (entry) => entry);

      await service.wrapKeyForEphemeralShare(
        'fv-1',
        new Uint8Array([1, 2, 3]),
        'share-1',
        'requester-1',
      );

      expect(mockDeps.generateEciesKeyPair).toHaveBeenCalledTimes(1);
    });
  });

  // ── wrapKeyForRecipientKey ──────────────────────────────────────

  describe('wrapKeyForRecipientKey', () => {
    it('creates entry with correct keyType ecies_secp256k1', async () => {
      mockRepo.createEntry.mockImplementation(async (entry) => entry);

      const result = await service.wrapKeyForRecipientKey(
        'fv-1',
        new Uint8Array([1, 2, 3]),
        new Uint8Array([77, 78, 79]),
        'ecies_secp256k1',
        'share-1',
        'requester-1',
      );

      expect(result.keyType).toBe('ecies_secp256k1');
      expect(result.recipientType).toBe('recipient_key');
      expect(result.wrappingPublicKey).toEqual(new Uint8Array([77, 78, 79]));
    });

    it('creates entry with correct keyType pgp', async () => {
      mockRepo.createEntry.mockImplementation(async (entry) => entry);

      const result = await service.wrapKeyForRecipientKey(
        'fv-1',
        new Uint8Array([1, 2, 3]),
        new Uint8Array([80, 81, 82]),
        'pgp',
        'share-2',
        'requester-1',
      );

      expect(result.keyType).toBe('pgp');
      expect(result.recipientType).toBe('recipient_key');
    });

    it('encrypts under the caller-provided public key', async () => {
      mockRepo.createEntry.mockImplementation(async (entry) => entry);
      const recipientPubKey = new Uint8Array([77, 78, 79]);

      await service.wrapKeyForRecipientKey(
        'fv-1',
        new Uint8Array([1, 2, 3]),
        recipientPubKey,
        'ecies_secp256k1',
        'share-1',
        'requester-1',
      );

      expect(mockDeps.eciesEncrypt).toHaveBeenCalledWith(
        recipientPubKey,
        new Uint8Array([1, 2, 3]),
      );
    });
  });

  // ── getWrappedKey ───────────────────────────────────────────────

  describe('getWrappedKey', () => {
    it('returns entry by recipientUserId', async () => {
      const entry = makeEntry({ recipientUserId: 'user-1' });
      mockRepo.getEntryByRecipient.mockResolvedValue(entry);

      const result = await service.getWrappedKey('fv-1', 'user-1');

      expect(result).toBe(entry);
      expect(mockRepo.getEntryByRecipient).toHaveBeenCalledWith(
        'fv-1',
        'user-1',
      );
    });

    it('returns entry by shareLinkId', async () => {
      const entry = makeEntry({
        recipientType: 'ephemeral_share',
        shareLinkId: 'share-1',
      });
      mockRepo.getEntryByShareLink.mockResolvedValue(entry);

      const result = await service.getWrappedKey('fv-1', undefined, 'share-1');

      expect(result).toBe(entry);
      expect(mockRepo.getEntryByShareLink).toHaveBeenCalledWith(
        'fv-1',
        'share-1',
      );
    });

    it('returns null when neither recipientUserId nor shareLinkId provided', async () => {
      const result = await service.getWrappedKey('fv-1');

      expect(result).toBeNull();
      expect(mockRepo.getEntryByRecipient).not.toHaveBeenCalled();
      expect(mockRepo.getEntryByShareLink).not.toHaveBeenCalled();
    });

    it('prefers recipientUserId over shareLinkId when both provided', async () => {
      const entry = makeEntry({ recipientUserId: 'user-1' });
      mockRepo.getEntryByRecipient.mockResolvedValue(entry);

      const result = await service.getWrappedKey('fv-1', 'user-1', 'share-1');

      expect(result).toBe(entry);
      expect(mockRepo.getEntryByRecipient).toHaveBeenCalledWith(
        'fv-1',
        'user-1',
      );
      expect(mockRepo.getEntryByShareLink).not.toHaveBeenCalled();
    });
  });

  // ── revokeWrapping ──────────────────────────────────────────────

  describe('revokeWrapping', () => {
    it('deletes entry and logs audit', async () => {
      await service.revokeWrapping('entry-1', 'requester-1');

      expect(mockRepo.deleteEntry).toHaveBeenCalledWith('entry-1');
      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.ShareRevoked,
          actorId: 'requester-1',
          targetId: 'entry-1',
        }),
      );
    });
  });

  // ── revokeAllWrappings ──────────────────────────────────────────

  describe('revokeAllWrappings', () => {
    it('deletes all entries and returns count', async () => {
      mockRepo.deleteAllForFileVersion.mockResolvedValue(5);

      const count = await service.revokeAllWrappings('fv-1', 'requester-1');

      expect(count).toBe(5);
      expect(mockRepo.deleteAllForFileVersion).toHaveBeenCalledWith('fv-1');
    });

    it('logs ShareRevoked audit event with count', async () => {
      mockRepo.deleteAllForFileVersion.mockResolvedValue(3);

      await service.revokeAllWrappings('fv-1', 'requester-1');

      expect(mockDeps.onAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          operationType: FileAuditOperationType.ShareRevoked,
          actorId: 'requester-1',
          targetId: 'fv-1',
          metadata: expect.objectContaining({
            revokedCount: 3,
          }),
        }),
      );
    });

    it('returns 0 when no entries exist', async () => {
      mockRepo.deleteAllForFileVersion.mockResolvedValue(0);

      const count = await service.revokeAllWrappings('fv-empty', 'requester-1');

      expect(count).toBe(0);
    });
  });
});
