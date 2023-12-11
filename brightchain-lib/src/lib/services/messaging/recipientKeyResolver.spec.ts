import { EmailErrorType } from '../../enumerations/messaging/emailErrorType';
import { MessageEncryptionScheme } from '../../enumerations/messaging/messageEncryptionScheme';
import { EmailError } from '../../errors/messaging/emailError';
import { IKeyStore, IKeyStoreEntry } from '../../interfaces/messaging/keyStore';
import { RecipientKeyResolver } from './recipientKeyResolver';

/**
 * Unit tests for RecipientKeyResolver.
 *
 * @see Requirements 2.3, 3.2, 7.2, 14.1, 14.2, 14.4
 */

// ── Helpers ──────────────────────────────────────────────────────────────

function makeEntry(
  overrides: Partial<IKeyStoreEntry> &
    Pick<IKeyStoreEntry, 'type' | 'associatedEmail' | 'publicMaterial'>,
): IKeyStoreEntry {
  return {
    id: 'entry-1',
    userId: 'user-1',
    metadata: {} as IKeyStoreEntry['metadata'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function createMockKeyStore(
  entriesByEmail: Record<string, IKeyStoreEntry[]>,
): IKeyStore {
  return {
    getKeysForEmail: jest.fn(
      async (email: string) => entriesByEmail[email] ?? [],
    ),
    storeGpgKeyPair: jest.fn(),
    storeGpgPublicKey: jest.fn(),
    getGpgKeyPair: jest.fn(),
    getGpgPublicKey: jest.fn(),
    deleteGpgKeyPair: jest.fn(),
    storeSmimeCertificate: jest.fn(),
    storeSmimeContactCert: jest.fn(),
    getSmimeCertificate: jest.fn(),
    getSmimeContactCert: jest.fn(),
    deleteSmimeCertificate: jest.fn(),
    setEncryptionPreference: jest.fn(),
    getEncryptionPreference: jest.fn(),
  } as unknown as IKeyStore;
}

// ── Tests ────────────────────────────────────────────────────────────────

describe('RecipientKeyResolver', () => {
  // ── resolveAvailability ──────────────────────────────────────────────

  describe('resolveAvailability', () => {
    it('should return correct availability for mixed recipients', async () => {
      const store = createMockKeyStore({
        'alice@example.com': [
          makeEntry({
            type: 'gpg_public',
            associatedEmail: 'alice@example.com',
            publicMaterial: 'gpg-key-alice',
          }),
          makeEntry({
            type: 'smime_cert',
            associatedEmail: 'alice@example.com',
            publicMaterial: 'smime-cert-alice',
          }),
        ],
        'bob@example.com': [
          makeEntry({
            type: 'gpg_keypair',
            associatedEmail: 'bob@example.com',
            publicMaterial: 'gpg-key-bob',
          }),
        ],
        // carol has no keys
      });

      const resolver = new RecipientKeyResolver(store);
      const result = await resolver.resolveAvailability([
        'alice@example.com',
        'bob@example.com',
        'carol@example.com',
      ]);

      expect(result).toHaveLength(3);

      // Alice has both GPG and S/MIME
      expect(result[0]).toEqual({
        email: 'alice@example.com',
        hasGpgKey: true,
        hasSmimeCert: true,
        hasEciesKey: false,
        isInternal: false,
      });

      // Bob has GPG only (keypair counts)
      expect(result[1]).toEqual({
        email: 'bob@example.com',
        hasGpgKey: true,
        hasSmimeCert: false,
        hasEciesKey: false,
        isInternal: false,
      });

      // Carol has nothing
      expect(result[2]).toEqual({
        email: 'carol@example.com',
        hasGpgKey: false,
        hasSmimeCert: false,
        hasEciesKey: false,
        isInternal: false,
      });
    });

    it('should return empty array for empty email list', async () => {
      const store = createMockKeyStore({});
      const resolver = new RecipientKeyResolver(store);
      const result = await resolver.resolveAvailability([]);
      expect(result).toEqual([]);
    });

    it('should detect smime_bundle as S/MIME availability', async () => {
      const store = createMockKeyStore({
        'dave@example.com': [
          makeEntry({
            type: 'smime_bundle',
            associatedEmail: 'dave@example.com',
            publicMaterial: 'smime-bundle-dave',
          }),
        ],
      });

      const resolver = new RecipientKeyResolver(store);
      const result = await resolver.resolveAvailability(['dave@example.com']);

      expect(result[0].hasSmimeCert).toBe(true);
      expect(result[0].hasGpgKey).toBe(false);
    });
  });

  // ── resolveKeysForScheme ─────────────────────────────────────────────

  describe('resolveKeysForScheme', () => {
    it('should resolve GPG keys and identify missing recipients', async () => {
      const store = createMockKeyStore({
        'alice@example.com': [
          makeEntry({
            type: 'gpg_public',
            associatedEmail: 'alice@example.com',
            publicMaterial: 'gpg-key-alice',
          }),
        ],
        // bob has no GPG key
      });

      const resolver = new RecipientKeyResolver(store);

      await expect(
        resolver.resolveKeysForScheme(
          ['alice@example.com', 'bob@example.com'],
          MessageEncryptionScheme.GPG,
        ),
      ).rejects.toThrow(EmailError);

      try {
        await resolver.resolveKeysForScheme(
          ['alice@example.com', 'bob@example.com'],
          MessageEncryptionScheme.GPG,
        );
      } catch (err) {
        const emailErr = err as EmailError;
        expect(emailErr.errorType).toBe(EmailErrorType.RECIPIENT_KEY_MISSING);
        expect(emailErr.details?.['missingEmails']).toEqual([
          'bob@example.com',
        ]);
      }
    });

    it('should resolve GPG keys successfully when all recipients have keys', async () => {
      const store = createMockKeyStore({
        'alice@example.com': [
          makeEntry({
            type: 'gpg_public',
            associatedEmail: 'alice@example.com',
            publicMaterial: 'gpg-key-alice',
          }),
        ],
        'bob@example.com': [
          makeEntry({
            type: 'gpg_keypair',
            associatedEmail: 'bob@example.com',
            publicMaterial: 'gpg-key-bob',
          }),
        ],
      });

      const resolver = new RecipientKeyResolver(store);
      const result = await resolver.resolveKeysForScheme(
        ['alice@example.com', 'bob@example.com'],
        MessageEncryptionScheme.GPG,
      );

      expect(result.gpgKeys.get('alice@example.com')).toBe('gpg-key-alice');
      expect(result.gpgKeys.get('bob@example.com')).toBe('gpg-key-bob');
      expect(result.missingGpg).toEqual([]);
    });

    it('should resolve S/MIME certs and identify missing recipients', async () => {
      const store = createMockKeyStore({
        'alice@example.com': [
          makeEntry({
            type: 'smime_cert',
            associatedEmail: 'alice@example.com',
            publicMaterial: 'smime-cert-alice',
          }),
        ],
        // bob has no S/MIME cert
      });

      const resolver = new RecipientKeyResolver(store);

      await expect(
        resolver.resolveKeysForScheme(
          ['alice@example.com', 'bob@example.com'],
          MessageEncryptionScheme.S_MIME,
        ),
      ).rejects.toThrow(EmailError);

      try {
        await resolver.resolveKeysForScheme(
          ['alice@example.com', 'bob@example.com'],
          MessageEncryptionScheme.S_MIME,
        );
      } catch (err) {
        const emailErr = err as EmailError;
        expect(emailErr.errorType).toBe(EmailErrorType.RECIPIENT_KEY_MISSING);
        expect(emailErr.details?.['missingEmails']).toEqual([
          'bob@example.com',
        ]);
      }
    });

    it('should resolve S/MIME certs successfully when all recipients have certs', async () => {
      const store = createMockKeyStore({
        'alice@example.com': [
          makeEntry({
            type: 'smime_cert',
            associatedEmail: 'alice@example.com',
            publicMaterial: 'smime-cert-alice',
          }),
        ],
        'bob@example.com': [
          makeEntry({
            type: 'smime_bundle',
            associatedEmail: 'bob@example.com',
            publicMaterial: 'smime-bundle-bob',
          }),
        ],
      });

      const resolver = new RecipientKeyResolver(store);
      const result = await resolver.resolveKeysForScheme(
        ['alice@example.com', 'bob@example.com'],
        MessageEncryptionScheme.S_MIME,
      );

      expect(result.smimeCerts.get('alice@example.com')).toBe(
        'smime-cert-alice',
      );
      expect(result.smimeCerts.get('bob@example.com')).toBe('smime-bundle-bob');
      expect(result.missingSmime).toEqual([]);
    });

    it('should mark all recipients as missing ECIES for RECIPIENT_KEYS scheme', async () => {
      const store = createMockKeyStore({
        'alice@example.com': [
          makeEntry({
            type: 'gpg_public',
            associatedEmail: 'alice@example.com',
            publicMaterial: 'gpg-key-alice',
          }),
        ],
      });

      const resolver = new RecipientKeyResolver(store);
      const result = await resolver.resolveKeysForScheme(
        ['alice@example.com', 'bob@example.com'],
        MessageEncryptionScheme.RECIPIENT_KEYS,
      );

      // ECIES is handled separately — all marked missing
      expect(result.missingEcies).toEqual([
        'alice@example.com',
        'bob@example.com',
      ]);
      expect(result.gpgKeys.size).toBe(0);
      expect(result.smimeCerts.size).toBe(0);
    });

    it('should return empty maps for NONE scheme', async () => {
      const store = createMockKeyStore({});
      const resolver = new RecipientKeyResolver(store);
      const result = await resolver.resolveKeysForScheme(
        ['alice@example.com'],
        MessageEncryptionScheme.NONE,
      );

      expect(result.gpgKeys.size).toBe(0);
      expect(result.smimeCerts.size).toBe(0);
      expect(result.eciesKeys.size).toBe(0);
      expect(result.missingGpg).toEqual([]);
      expect(result.missingSmime).toEqual([]);
      expect(result.missingEcies).toEqual([]);
    });

    it('should include scheme and missingEmails in error details', async () => {
      const store = createMockKeyStore({});
      const resolver = new RecipientKeyResolver(store);

      try {
        await resolver.resolveKeysForScheme(
          ['missing@example.com'],
          MessageEncryptionScheme.GPG,
        );
        fail('Expected EmailError to be thrown');
      } catch (err) {
        const emailErr = err as EmailError;
        expect(emailErr.details?.['scheme']).toBe('gpg');
        expect(emailErr.details?.['missingEmails']).toEqual([
          'missing@example.com',
        ]);
      }
    });
  });
});
